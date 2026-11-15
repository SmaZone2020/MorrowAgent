use serde::Serialize;
use std::io::Read;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

/// The longest a single command may run. A package build is minutes, not
/// hours, and a hung `npm install` must not hold the conversation forever.
const TIMEOUT: Duration = Duration::from_secs(120);

/// How much stdout and stderr come back. A failing build can print megabytes;
/// the model reads the tail, which is where the actual error is.
const KEEP_BYTES: usize = 16 * 1024;

#[derive(Debug, Clone, Serialize)]
pub struct ShellResult {
    #[serde(rename = "command")]
    pub Command: String,
    /// The shell the command actually ran in.
    #[serde(rename = "shell")]
    pub Shell: String,
    #[serde(rename = "stdout")]
    pub Stdout: String,
    #[serde(rename = "stderr")]
    pub Stderr: String,
    /// `None` when the process could not start at all.
    #[serde(rename = "code")]
    pub Code: Option<i32>,
    #[serde(rename = "timedOut")]
    pub TimedOut: bool,
}

/// Keeps the tail of one stream, and says how much was dropped.
fn tail(text: &[u8]) -> String {
    let lossy = String::from_utf8_lossy(text);
    if lossy.len() <= KEEP_BYTES {
        return lossy.to_string();
    }
    let mut start = lossy.len() - KEEP_BYTES;
    while start < lossy.len() && !lossy.is_char_boundary(start) {
        start += 1;
    }
    let dropped = lossy[..start].matches('\n').count();
    format!(
        "（前面约 {dropped} 行已省略）\n{}",
        &lossy[start..]
    )
}

fn run_child(mut command: Command) -> Result<ShellResult, String> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let display_command = format!("{command:?}");
    let mut child = command
        .spawn()
        .map_err(|error| format!("无法启动命令：{error}"))?;

    let started = Instant::now();
    let mut timed_out = false;
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if started.elapsed() >= TIMEOUT {
                    timed_out = true;
                    let _ = child.kill();
                    break;
                }
                std::thread::sleep(Duration::from_millis(60));
            }
            Err(error) => return Err(format!("等待命令失败：{error}")),
        }
    }

    // Both pipes are drained after the wait, so a command that filled its
    // buffer would have blocked: the caps in `tail` keep the read bounded.
    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    if let Some(mut pipe) = child.stdout.take() {
        let _ = pipe.read_to_end(&mut stdout);
    }
    if let Some(mut pipe) = child.stderr.take() {
        let _ = pipe.read_to_end(&mut stderr);
    }

    let status = child.wait().ok();
    Ok(ShellResult {
        Command: display_command,
        Shell: String::new(),
        Stdout: tail(&stdout),
        Stderr: tail(&stderr),
        Code: status.and_then(|status| status.code()),
        TimedOut: timed_out,
    })
}

/// Runs one command in the workspace with the platform's shell.
pub fn run(
    cwd: &std::path::Path,
    shell_kind: &str,
    shell_path: &str,
    command: &str,
) -> Result<ShellResult, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("command 不能为空".to_string());
    }

    let mut process = if cfg!(windows) {
        // `-NoProfile` keeps a user's prompt/alias set out of the result, and
        // `-Command` (not `-File`) is what makes a compound line work.
        let mut process = Command::new(shell_path);
        process.args(["-NoProfile", "-NonInteractive", "-Command", trimmed]);
        process
    } else {
        let mut process = Command::new(shell_path);
        process.args(["-lc", trimmed]);
        process
    };
    process.current_dir(cwd);

    let mut result = run_child(process)?;
    result.Shell = shell_kind.to_string();
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::tail;

    #[test]
    fn short_output_is_untouched() {
        assert_eq!(tail(b"hello"), "hello");
    }

    #[test]
    fn long_output_keeps_the_tail() {
        let mut raw = String::new();
        for index in 0..4000 {
            raw.push_str(&format!("line {index}\n"));
        }
        let kept = tail(raw.as_bytes());
        assert!(kept.contains("line 3999"));
        assert!(kept.contains("已省略"));
        assert!(kept.len() < raw.len());
    }
}
