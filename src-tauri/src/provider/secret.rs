use serde::{Deserialize, Serialize};

/// What gets persisted for a provider. The API key travels through here but is
/// never written in plaintext: the whole record is encrypted as one blob.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredProvider {
    #[serde(rename = "baseUrl")]
    pub BaseUrl: String,
    #[serde(rename = "model")]
    pub Model: String,
    #[serde(rename = "apiKey")]
    pub ApiKey: String,
}

#[cfg(target_os = "windows")]
mod platform {
    use std::ptr;
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB,
    };

    fn as_blob(bytes: &[u8]) -> CRYPT_INTEGER_BLOB {
        CRYPT_INTEGER_BLOB {
            cbData: bytes.len() as u32,
            pbData: bytes.as_ptr() as *mut u8,
        }
    }

    /// DPAPI ties the ciphertext to the current Windows user, so a copied file
    /// is useless on another machine without any key material of our own.
    pub fn protect(plain: &[u8]) -> Result<Vec<u8>, String> {
        let input = as_blob(plain);
        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: ptr::null_mut(),
        };

        let ok = unsafe {
            CryptProtectData(
                &input,
                ptr::null(),
                ptr::null(),
                ptr::null(),
                ptr::null(),
                0,
                &mut output,
            )
        };
        if ok == 0 {
            return Err("系统加密失败".to_string());
        }

        let bytes = unsafe {
            std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec()
        };
        unsafe { LocalFree(output.pbData as *mut _) };
        Ok(bytes)
    }

    pub fn unprotect(cipher: &[u8]) -> Result<Vec<u8>, String> {
        let input = as_blob(cipher);
        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: ptr::null_mut(),
        };

        let ok = unsafe {
            CryptUnprotectData(
                &input,
                ptr::null_mut(),
                ptr::null(),
                ptr::null(),
                ptr::null(),
                0,
                &mut output,
            )
        };
        if ok == 0 {
            return Err("系统解密失败".to_string());
        }

        let bytes = unsafe {
            std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec()
        };
        unsafe { LocalFree(output.pbData as *mut _) };
        Ok(bytes)
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    // Android will use the Keystore; until that lands the build stays honest
    // rather than quietly writing a key in plaintext.
    pub fn protect(_plain: &[u8]) -> Result<Vec<u8>, String> {
        Err("当前平台暂不支持密钥加密存储".to_string())
    }

    pub fn unprotect(_cipher: &[u8]) -> Result<Vec<u8>, String> {
        Err("当前平台暂不支持密钥加密存储".to_string())
    }
}

fn blob_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位应用数据目录：{}", error))?;
    std::fs::create_dir_all(&dir).map_err(|error| format!("无法创建数据目录：{}", error))?;
    Ok(dir.join("provider.secret"))
}

pub fn save(app: &tauri::AppHandle, provider: &StoredProvider) -> Result<(), String> {
    let json = serde_json::to_vec(provider).map_err(|error| error.to_string())?;
    let cipher = platform::protect(&json)?;
    std::fs::write(blob_path(app)?, cipher).map_err(|error| format!("写入失败：{}", error))
}

pub fn load(app: &tauri::AppHandle) -> Result<Option<StoredProvider>, String> {
    let path = blob_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    let cipher = std::fs::read(&path).map_err(|error| format!("读取失败：{}", error))?;
    let plain = platform::unprotect(&cipher)?;
    let provider =
        serde_json::from_slice(&plain).map_err(|error| format!("配置已损坏：{}", error))?;
    Ok(Some(provider))
}

pub fn clear(app: &tauri::AppHandle) -> Result<(), String> {
    let path = blob_path(app)?;
    if path.exists() {
        std::fs::remove_file(path).map_err(|error| format!("删除失败：{}", error))?;
    }
    Ok(())
}
