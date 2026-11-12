use std::path::{Path, PathBuf};

use crate::package::archive;

/// The three files that make up "everything the app remembers about you".
///
/// Package content is excluded on purpose: a `.morrow` file is replaceable and
/// already exportable from the shelf, while a conversation, a wrong answer and
/// a scroll position are not. Provider keys are excluded too — they live in a
/// DPAPI blob bound to this Windows account and would not open elsewhere.
pub const BACKUP_FILES: [&str; 3] = ["morrow.db", "ui-state.json", "preferences.json"];

/// Packs the local store into `target` and returns its size.
///
/// The caller checkpoints the WAL first. Without it the last few answers sit in
/// `morrow.db-wal` while the main file looks complete, and the backup would
/// quietly be a few minutes old.
pub fn backup(data_dir: &Path, target: &Path) -> Result<u64, String> {
    let staged = temp_dir("backup-out");
    std::fs::create_dir_all(&staged).map_err(|error| format!("无法创建临时目录：{error}"))?;

    let result = (|| {
        let mut copied = 0;
        for name in BACKUP_FILES {
            let source = data_dir.join(name);
            if !source.exists() {
                // A fresh install has no `ui-state.json` yet, and that is not an
                // error: the backup should still hold the database.
                continue;
            }
            std::fs::copy(&source, staged.join(name))
                .map_err(|error| format!("无法复制 {name}：{error}"))?;
            copied += 1;
        }
        if copied == 0 {
            return Err("没有可以备份的数据".to_string());
        }
        archive::pack(&staged, target)
    })();

    let _ = std::fs::remove_dir_all(&staged);
    result
}

/// Restores a backup over the live store.
///
/// The archive is unpacked into a temporary directory and every entry checked
/// against `BACKUP_FILES` before a single byte replaces anything: a backup file
/// is one the user picked from disk, which is exactly the trust level of an
/// imported package.
///
/// The database is written through SQLite's own backup API rather than copied
/// over the file. On Windows the live database is open, so a plain copy would
/// fail on the lock; going through the API also means the restored file gets a
/// checkpointed page cache instead of a half-written one.
pub fn restore(
    data_dir: &Path,
    archive_path: &Path,
    connection: &mut rusqlite::Connection,
) -> Result<(), String> {    let entries = archive::list_entries(archive_path)?;

    let names: Vec<String> = entries
        .iter()
        .filter(|entry| !entry.IsDirectory)
        .map(|entry| entry.Name.clone())
        .collect();
    if names.is_empty() {
        return Err("备份文件是空的".to_string());
    }
    let unknown: Vec<&str> = names
        .iter()
        .filter(|name| !BACKUP_FILES.contains(&name.as_str()))
        .map(|name| name.as_str())
        .collect();
    if !unknown.is_empty() {
        return Err(format!("备份里有不认识的条目：{}", unknown.join("、")));
    }

    let unpacked = temp_dir("restore-in");
    let result = (|| {
        extract_named(archive_path, &unpacked, &names)?;
        let incoming = unpacked.join("morrow.db");
        if !incoming.exists() {
            return Err("备份里没有数据库文件".to_string());
        }

        // The current store is copied aside first: a restore that dies halfway
        // must leave something a learner can go back to.
        let safety = data_dir.with_file_name(format!(
            "{}-before-restore-{}",
            data_dir
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_else(|| "morrow".to_string()),
            nonce()
        ));
        std::fs::create_dir_all(&safety).map_err(|error| format!("无法创建备份目录：{error}"))?;
        for name in BACKUP_FILES {
            let current = data_dir.join(name);
            if current.exists() {
                std::fs::copy(&current, safety.join(name))
                    .map_err(|error| format!("无法保留现有 {name}：{error}"))?;
            }
        }

        copy_into_store(&incoming, connection)?;

        // The two JSON files are read whole and never held open, so they can be
        // copied over in place.
        for name in ["ui-state.json", "preferences.json"] {
            let source = unpacked.join(name);
            if source.exists() {
                std::fs::copy(&source, data_dir.join(name))
                    .map_err(|error| format!("无法写入 {name}：{error}"))?;
            }
        }
        Ok(())
    })();

    let _ = std::fs::remove_dir_all(&unpacked);
    result
}

/// Writes `source` over the open database, page by page.
fn copy_into_store(
    source: &Path,
    connection: &mut rusqlite::Connection,
) -> Result<(), String> {
    use rusqlite::backup::Backup;
    use std::time::Duration;

    let read = rusqlite::Connection::open(source)
        .map_err(|error| format!("无法读取备份里的数据库：{error}"))?;
    let backup = Backup::new(&read, connection)
        .map_err(|error| format!("无法准备恢复：{error}"))?;
    backup
        .run_to_completion(64, Duration::from_millis(5), None)
        .map_err(|error| format!("恢复数据库失败：{error}"))?;
    Ok(())
}

/// Drops the WAL sidecars so the main database file is complete on its own.
pub fn checkpoint(connection: &rusqlite::Connection) -> Result<(), String> {
    connection
        .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |_| Ok(()))
        .map_err(|error| format!("无法写入数据库快照：{error}"))?;
    Ok(())
}

/// Extracts exactly the whitelisted names.
///
/// `archive::extract` is not reused here because its extension gate exists to
/// stop a package shipping anything executable, and a database file is neither
/// allowed there nor dangerous here. The name whitelist is the stronger check
/// for a backup anyway: three known files, nothing else.
fn extract_named(archive_path: &Path, dest: &Path, names: &[String]) -> Result<(), String> {
    use sevenz_rust2::{ArchiveReader, Password};

    std::fs::create_dir_all(dest).map_err(|error| format!("无法创建临时目录：{error}"))?;
    let mut reader = ArchiveReader::open(archive_path, Password::empty())
        .map_err(|error| format!("不是合法的备份文件：{error}"))?;

    reader
        .for_each_entries(|entry, stream| {
            let relative = entry.name().replace('\\', "/");
            if entry.is_directory() || !names.iter().any(|name| name == &relative) {
                return Ok(true);
            }
            let mut buffer = Vec::with_capacity(entry.size() as usize);
            stream
                .read_to_end(&mut buffer)
                .map_err(|error| sevenz_rust2::Error::Io(error, "".into()))?;
            std::fs::write(dest.join(&relative), buffer)
                .map_err(|error| sevenz_rust2::Error::Io(error, "".into()))?;
            Ok(true)
        })
        .map_err(|error| format!("解压备份失败：{error}"))?;

    Ok(())
}

fn temp_dir(prefix: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!("morrow-{prefix}-{}", nonce()));
    let _ = std::fs::remove_dir_all(&path);
    path
}

fn nonce() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|elapsed| elapsed.as_nanos())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::{backup, checkpoint, restore, BACKUP_FILES};

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!(
            "morrow-data-{name}-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).expect("dir");
        path
    }

    fn fixture(directory: &std::path::Path) -> rusqlite::Connection {
        let connection = rusqlite::Connection::open(directory.join("morrow.db")).expect("db");
        connection
            .execute_batch(
                "PRAGMA journal_mode = WAL;
                 CREATE TABLE notes (body TEXT NOT NULL);
                 INSERT INTO notes (body) VALUES ('integration by parts');",
            )
            .expect("schema");
        checkpoint(&connection).expect("checkpoint");
        std::fs::write(directory.join("ui-state.json"), b"{\"version\":1}").expect("ui");
        std::fs::write(directory.join("preferences.json"), b"{\"thinking\":\"high\"}")
            .expect("prefs");
        connection
    }

    fn bodies(connection: &rusqlite::Connection) -> Vec<String> {
        let mut statement = connection
            .prepare("SELECT body FROM notes ORDER BY body")
            .expect("prepare");
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .expect("query");
        rows.collect::<Result<Vec<_>, _>>().expect("collect")
    }

    #[test]
    fn a_backup_restores_over_a_changed_store() {
        let source = temp_dir("source");
        let source_db = fixture(&source);
        let archive = temp_dir("archive-holder").join("store.morrow-backup");

        let bytes = backup(&source, &archive).expect("backup");
        assert!(bytes > 0);
        drop(source_db);

        // The live store diverges after the backup was taken.
        let target = temp_dir("target");
        let mut target_db = rusqlite::Connection::open(target.join("morrow.db")).expect("target db");
        target_db
            .execute_batch(
                "PRAGMA journal_mode = WAL;
                 CREATE TABLE notes (body TEXT NOT NULL);",
            )
            .expect("schema");

        restore(&target, &archive, &mut target_db).expect("restore");

        assert_eq!(bodies(&target_db), vec!["integration by parts".to_string()]);
        for name in BACKUP_FILES {
            assert!(target.join(name).exists(), "{name} restored");
        }

        drop(target_db);
        let _ = std::fs::remove_dir_all(&source);
        let _ = std::fs::remove_dir_all(&target);
        let _ = std::fs::remove_file(&archive);
    }

    #[test]
    fn an_empty_data_directory_is_not_backed_up() {
        let empty = temp_dir("empty");
        let target = empty.join("out.morrow-backup");
        assert!(backup(&empty, &target).is_err());
        let _ = std::fs::remove_dir_all(&empty);
    }
}
