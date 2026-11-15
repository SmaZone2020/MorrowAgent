use serde::Serialize;
use std::process::{Command, Stdio};

/// One thing the builder may or may not be able to run.
#[derive(Debug, Clone, Serialize)]
pub struct ToolProbe {
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "command")]
    pub Command: String,
    #[serde(rename = "available")]
    pub Available: bool,
    /// First line of the version output; empty when nothing answered.
    #[serde(rename = "version")]
    pub Version: String,
}

/// What the model is told about the machine it is authoring on.
#[derive(Debug, Clone, Serialize)]
pub struct BuildEnvironment {
    #[serde(rename = "os")]
    pub Os: String,
    #[serde(rename = "osVersion")]
    pub OsVersion: String,
    #[serde(rename = "arch")]
    pub Arch: String,
    /// `powershell` on Windows, `bash` elsewhere: what the shell tool speaks.
    #[serde(rename = "shell")]
    pub Shell: String,
    #[serde(rename = "shellPath")]
    pub ShellPath: String,
    #[serde(rename = "tools")]
    pub Tools: Vec<ToolProbe>,
    /// The folder the user opened, as a display path.
    #[serde(rename = "workspace")]
    pub Workspace: String,
}

/// The shell a command will run in. Windows prefers PowerShell because the
/// packaging scripts are Node; a POSIX system gets the user's own bash.
pub fn shell() -> (String, String) {
    if cfg!(windows) {
        let path = find_on_path("pwsh")
            .or_else(|| find_on_path("powershell"))
            .unwrap_or_else(|| "powershell".to_string());
        ("powershell".to_string(), path)
    } else {
        let path = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        ("bash".to_string(), path)
    }
}

/// `which`/`where` without a dependency: the first matching file on PATH.
fn find_on_path(program: &str) -> Option<String> {
    let path = std::env::var_os("PATH")?;
    let extensions: Vec<String> = if cfg!(windows) {
        let raw = std::env::var("PATHEXT")
            .unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".to_string());
        let mut list = vec![String::new()];
        list.extend(
            raw.split(';')
                .filter(|entry| !entry.is_empty())
                .map(|entry| entry.to_ascii_lowercase()),
        );
        list
    } else {
        vec![String::new()]
    };

    for dir in std::env::split_paths(&path) {
        for extension in &extensions {
            let candidate = dir.join(format!("{program}{extension}"));
            if candidate.is_file() {
                return Some(candidate.to_string_lossy().to_string());
            }
        }
    }
    None
}

/// Runs `<program> <args>` and returns stdout's first non-empty line.
fn version_of(program: &str, args: &[&str]) -> Option<String> {
    let mut command = Command::new(program);
    command
        .args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .stdout(Stdio::piped());
    if cfg!(windows) {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let output = command.output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    text.lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.to_string())
}

fn probe(name: &str, command: &str, args: &[&str]) -> ToolProbe {
    let version = version_of(command, args).unwrap_or_default();
    ToolProbe {
        Name: name.to_string(),
        Command: command.to_string(),
        Available: !version.is_empty(),
        Version: version,
    }
}

fn os_name() -> String {
    match std::env::consts::OS {
        "windows" => "Windows".to_string(),
        "macos" => "macOS".to_string(),
        "linux" => "Linux".to_string(),
        other => other.to_string(),
    }
}

#[cfg(windows)]
fn os_version() -> String {
    // The build number is what distinguishes Windows 10 from 11; the marketing
    // name lives in the registry and is not worth a dependency.
    if let Some(version) = version_of("cmd", &["/c", "ver"]) {
        return version;
    }
    std::env::var("OS").unwrap_or_else(|_| "Windows".to_string())
}

#[cfg(not(windows))]
fn os_version() -> String {
    if let Ok(raw) = std::fs::read_to_string("/etc/os-release") {
        if let Some(pretty) = raw
            .lines()
            .find_map(|line| line.strip_prefix("PRETTY_NAME="))
            .map(|value| value.trim().trim_matches('"').to_string())
        {
            return pretty;
        }
    }
    version_of("uname", &["-sr"]).unwrap_or_else(|| "unknown".to_string())
}

pub fn detect(workspace: &str) -> BuildEnvironment {
    let (shell, shell_path) = shell();
    BuildEnvironment {
        Os: os_name(),
        OsVersion: os_version(),
        Arch: std::env::consts::ARCH.to_string(),
        Shell: shell,
        ShellPath: shell_path,
        Workspace: workspace.to_string(),
        Tools: vec![
            probe("node", "node", &["--version"]),
            probe("npm", "npm", &["--version"]),
            probe("pnpm", "pnpm", &["--version"]),
            probe("python", "python", &["--version"]),
            probe("python3", "python3", &["--version"]),
            probe("git", "git", &["--version"]),
            probe("7z", "7z", &[]),
        ],
    }
}

