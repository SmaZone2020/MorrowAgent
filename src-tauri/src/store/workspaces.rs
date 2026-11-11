use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::{now, Store};

/// One workspace: the data side of a learning package. It outlives the package
/// on purpose — uninstalling content must not take the user's history with it
/// (MLPS §1.2), so an orphaned row keeps its name, cover and timestamps and only
/// loses `rootPath`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "packageId")]
    pub PackageId: String,
    #[serde(rename = "packageVersion")]
    pub PackageVersion: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "rootPath")]
    pub RootPath: String,
    #[serde(rename = "coverPath")]
    pub CoverPath: Option<String>,
    #[serde(rename = "accent")]
    pub Accent: Option<String>,
    #[serde(rename = "tags")]
    pub Tags: Vec<String>,
    #[serde(rename = "installedAt")]
    pub InstalledAt: i64,
    #[serde(rename = "lastOpenedAt")]
    pub LastOpenedAt: i64,
    #[serde(rename = "orphaned")]
    pub Orphaned: bool,
}

/// What the caller must supply to create or replace a workspace.
#[derive(Debug, Clone, Deserialize)]
pub struct NewWorkspace {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "packageId")]
    pub PackageId: String,
    #[serde(rename = "packageVersion")]
    pub PackageVersion: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "rootPath")]
    pub RootPath: String,
    #[serde(rename = "coverPath", default)]
    pub CoverPath: Option<String>,
    #[serde(rename = "accent", default)]
    pub Accent: Option<String>,
    #[serde(rename = "tags", default)]
    pub Tags: Vec<String>,
}

impl Store {
    pub fn workspaces(&self) -> Result<Vec<Workspace>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, package_id, package_version, name, root_path, cover_path,
                        accent, tags, installed_at, last_opened_at, orphaned
                 FROM workspaces
                 ORDER BY orphaned ASC, last_opened_at DESC, installed_at DESC",
            )
            .map_err(|error| format!("查询学习包失败：{}", error))?;

        let rows = statement
            .query_map([], read_workspace)
            .map_err(|error| format!("读取学习包失败：{}", error))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("解析学习包失败：{}", error))
    }

    pub fn workspace(&self, id: &str) -> Result<Option<Workspace>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, package_id, package_version, name, root_path, cover_path,
                        accent, tags, installed_at, last_opened_at, orphaned
                 FROM workspaces WHERE id = ?1",
            )
            .map_err(|error| format!("查询学习包失败：{}", error))?;

        let mut rows = statement
            .query_map(params![id], read_workspace)
            .map_err(|error| format!("读取学习包失败：{}", error))?;

        match rows.next() {
            Some(row) => row
                .map(Some)
                .map_err(|error| format!("解析学习包失败：{}", error)),
            None => Ok(None),
        }
    }

    pub fn workspace_for_package(&self, package_id: &str) -> Result<Option<Workspace>, String> {
        Ok(self
            .workspaces()?
            .into_iter()
            .find(|workspace| workspace.PackageId == package_id))
    }

    /// Inserts or replaces a workspace by id. Replacing keeps `last_opened_at`
    /// and the id, so an update does not detach the history attached to it.
    pub fn upsert_workspace(&self, workspace: NewWorkspace) -> Result<Workspace, String> {
        let tags = serde_json::to_string(&workspace.Tags).unwrap_or_else(|_| "[]".to_string());
        let stamp = now();

        // The guard is released before the read-back below: `self.workspace`
        // takes the same mutex, so holding it here would deadlock.
        self.lock()?
            .execute(
                "INSERT INTO workspaces
                   (id, package_id, package_version, name, root_path, cover_path,
                    accent, tags, installed_at, last_opened_at, orphaned)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 0)
                 ON CONFLICT(id) DO UPDATE SET
                   package_id = excluded.package_id,
                   package_version = excluded.package_version,
                   name = excluded.name,
                   root_path = excluded.root_path,
                   cover_path = excluded.cover_path,
                   accent = excluded.accent,
                   tags = excluded.tags,
                   orphaned = 0",
                params![
                    workspace.Id,
                    workspace.PackageId,
                    workspace.PackageVersion,
                    workspace.Name,
                    workspace.RootPath,
                    workspace.CoverPath,
                    workspace.Accent,
                    tags,
                    stamp
                ],
            )
            .map_err(|error| format!("保存学习包失败：{}", error))?;

        self.workspace(&workspace.Id)?
            .ok_or_else(|| "学习包写入后读取失败".to_string())
    }

    pub fn touch_workspace(&self, id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE workspaces SET last_opened_at = ?1 WHERE id = ?2",
                params![now(), id],
            )
            .map_err(|error| format!("更新学习包时间失败：{}", error))?;
        Ok(())
    }

    /// Marks a workspace orphaned without touching its data. This is the
    /// default uninstall: content leaves, history stays readable.
    pub fn orphan_workspace(&self, id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE workspaces SET orphaned = 1, root_path = '' WHERE id = ?1",
                params![id],
            )
            .map_err(|error| format!("移除学习包失败：{}", error))?;
        Ok(())
    }

    /// Deletes a workspace and everything that hangs off it. Only used when the
    /// user explicitly asks to drop the learning data too.
    pub fn delete_workspace(&self, id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute("DELETE FROM conversations WHERE workspace_id = ?1", params![id])
            .map_err(|error| format!("删除会话失败：{}", error))?;
        connection
            .execute(
                "DELETE FROM answer_attempts WHERE workspace_id = ?1",
                params![id],
            )
            .map_err(|error| format!("删除作答记录失败：{}", error))?;
        connection
            .execute("DELETE FROM workspaces WHERE id = ?1", params![id])
            .map_err(|error| format!("删除学习包失败：{}", error))?;
        Ok(())
    }

    /// Gives rows written before workspaces existed a home, so an upgrade does
    /// not turn every existing conversation into an orphan.
    pub fn adopt_orphan_rows(&self, workspace_id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE conversations SET workspace_id = ?1 WHERE workspace_id = ''",
                params![workspace_id],
            )
            .map_err(|error| format!("迁移会话失败：{}", error))?;
        connection
            .execute(
                "UPDATE answer_attempts SET workspace_id = ?1 WHERE workspace_id = ''",
                params![workspace_id],
            )
            .map_err(|error| format!("迁移作答记录失败：{}", error))?;
        Ok(())
    }
}

fn read_workspace(row: &rusqlite::Row<'_>) -> rusqlite::Result<Workspace> {
    let tags: String = row.get(7)?;
    Ok(Workspace {
        Id: row.get(0)?,
        PackageId: row.get(1)?,
        PackageVersion: row.get(2)?,
        Name: row.get(3)?,
        RootPath: row.get(4)?,
        CoverPath: row.get(5)?,
        Accent: row.get(6)?,
        Tags: serde_json::from_str(&tags).unwrap_or_default(),
        InstalledAt: row.get(8)?,
        LastOpenedAt: row.get(9)?,
        Orphaned: row.get::<_, i64>(10)? != 0,
    })
}

#[cfg(test)]
mod tests {
    use super::super::{open, NewWorkspace};
    use std::sync::atomic::{AtomicU32, Ordering};

    fn temp_store() -> (std::path::PathBuf, super::Store) {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let slot = COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "morrow-workspaces-{}-{}.db",
            std::process::id(),
            slot
        ));
        let _ = std::fs::remove_file(&path);
        let store = open(&path).expect("database opens");
        (path, store)
    }

    fn workspace(id: &str, package_id: &str) -> NewWorkspace {
        NewWorkspace {
            Id: id.to_string(),
            PackageId: package_id.to_string(),
            PackageVersion: "1.0.0".to_string(),
            Name: "应用高等数学".to_string(),
            RootPath: format!("/tmp/{id}"),
            CoverPath: None,
            Accent: Some("#2f6f5e".to_string()),
            Tags: vec!["calculus".to_string()],
        }
    }

    #[test]
    fn a_workspace_round_trips_its_tags() {
        let (path, store) = temp_store();
        store.upsert_workspace(workspace("w1", "cn.morrow.calculus")).expect("insert");

        let stored = store.workspace("w1").expect("read").expect("present");
        assert_eq!(stored.Tags, vec!["calculus".to_string()]);
        assert_eq!(stored.Accent.as_deref(), Some("#2f6f5e"));
        assert!(!stored.Orphaned);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn installing_again_updates_in_place_without_detaching_history() {
        let (path, store) = temp_store();
        store.upsert_workspace(workspace("w1", "cn.morrow.calculus")).expect("insert");
        store.touch_workspace("w1").expect("touch");
        let first = store.workspace("w1").expect("read").expect("present");

        let mut next = workspace("w1", "cn.morrow.calculus");
        next.PackageVersion = "1.1.0".to_string();
        next.Name = "应用高等数学（第二版）".to_string();
        store.upsert_workspace(next).expect("update");

        let second = store.workspace("w1").expect("read").expect("present");
        assert_eq!(second.PackageVersion, "1.1.0");
        assert_eq!(second.Name, "应用高等数学（第二版）");
        assert_eq!(second.LastOpenedAt, first.LastOpenedAt);
        assert_eq!(store.workspaces().expect("list").len(), 1);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn orphaning_keeps_the_row_and_clears_the_path() {
        let (path, store) = temp_store();
        store.upsert_workspace(workspace("w1", "cn.morrow.calculus")).expect("insert");
        store.orphan_workspace("w1").expect("orphan");

        let stored = store.workspace("w1").expect("read").expect("present");
        assert!(stored.Orphaned);
        assert!(stored.RootPath.is_empty());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn deleting_a_workspace_drops_its_rows() {
        let (path, store) = temp_store();
        store.upsert_workspace(workspace("w1", "cn.morrow.calculus")).expect("insert");
        store
            .append(
                "c1",
                "w1",
                super::super::NewMessage {
                    Id: "m1".to_string(),
                    Role: "user".to_string(),
                    Content: "hi".to_string(),
                    CreatedAt: Some(1),
                    Attachments: Vec::new(),
                },
            )
            .expect("append");
        store.delete_workspace("w1").expect("delete");

        assert!(store.workspace("w1").expect("read").is_none());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn adopting_orphan_rows_claims_only_unassigned_ones() {
        let (path, store) = temp_store();
        store.upsert_workspace(workspace("w1", "cn.morrow.calculus")).expect("insert");
        // An empty workspace id is what a row written before workspaces existed
        // looks like after migration 3.
        store
            .append(
                "legacy",
                "",
                super::super::NewMessage {
                    Id: "m1".to_string(),
                    Role: "user".to_string(),
                    Content: "hi".to_string(),
                    CreatedAt: Some(1),
                    Attachments: Vec::new(),
                },
            )
            .expect("append");
        store
            .append(
                "owned",
                "w2",
                super::super::NewMessage {
                    Id: "m2".to_string(),
                    Role: "user".to_string(),
                    Content: "hello".to_string(),
                    CreatedAt: Some(2),
                    Attachments: Vec::new(),
                },
            )
            .expect("append");

        store.adopt_orphan_rows("w1").expect("adopt");
        let assigned: i64 = store
            .lock()
            .expect("lock")
            .query_row(
                "SELECT COUNT(*) FROM conversations WHERE workspace_id = 'w1'",
                [],
                |row| row.get(0),
            )
            .expect("count");
        assert_eq!(assigned, 1, "only the unassigned row is claimed");
        assert_eq!(store.conversations("w2", 10).expect("w2").len(), 1);

        let _ = std::fs::remove_file(path);
    }
}
