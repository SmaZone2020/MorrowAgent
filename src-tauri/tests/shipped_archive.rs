//! Imports the archive that actually ships to users.
//!
//! The unit tests build their archives with `archive::pack`, which writes POSIX
//! entry names and non-solid blocks. The file a user picks is produced by a
//! third-party 7z binary, which writes backslashes and one solid block, so the
//! two shapes have to be exercised separately. The archive lives under
//! `dist-packages/`, which is not tracked, so a checkout without a build skips
//! instead of failing.

use std::path::{Path, PathBuf};

use morrow_agent_lib::package;

fn shipped_archive() -> Option<PathBuf> {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../dist-packages");
    let mut found: Vec<PathBuf> = std::fs::read_dir(dir)
        .ok()?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "morrow"))
        .collect();
    found.sort();
    found.into_iter().next()
}

fn workspace(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("morrow-shipped-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).expect("dir");
    dir
}

#[test]
fn the_shipped_archive_lists_posix_names_and_installs() {
    let Some(archive) = shipped_archive() else {
        eprintln!("skipped: no .morrow in dist-packages");
        return;
    };

    let entries = package::archive::list_entries(&archive).expect("listing");
    assert!(
        entries.len() > 200,
        "expected a full package, listed {} entries",
        entries.len()
    );
    assert!(
        entries.iter().all(|entry| !entry.Name.contains('\\')),
        "a backslash survived the listing, so every path check downstream would fail"
    );

    let work = workspace("install");
    let packages = work.join("packages");
    let staging = package::staging_path(&packages);
    let report = package::inspect(&archive, &staging).expect("inspect");
    assert!(report.Ok, "checks failed: {:#?}", report.Checks);
    let stats = report.Stats.as_ref().expect("stats");
    assert_eq!(stats.Points, 72);
    assert_eq!(stats.Questions, 33);

    let installed = package::install(&staging, &packages).expect("install");
    assert_eq!(installed.Manifest.Id, "cn.morrow.calculus.shaanxi-upgrade");
    assert!(Path::new(&installed.RootPath).join("manifest.yaml").exists());
    assert!(installed.CoverPath.is_some(), "the shelf needs a cover");

    let _ = std::fs::remove_dir_all(work);
}
