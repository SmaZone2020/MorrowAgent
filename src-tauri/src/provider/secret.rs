use serde::{Deserialize, Serialize};

use super::protocol::Protocol;

/// One configured provider. The API key travels through here but is never
/// written in plaintext: the whole book is encrypted as one blob.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredProviderProfile {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "baseUrl")]
    pub BaseUrl: String,
    #[serde(rename = "apiKey")]
    pub ApiKey: String,
    #[serde(rename = "protocol", default)]
    pub Protocol: Protocol,
    /// Models known for this provider, filled by "拉取模型" or typed by hand.
    #[serde(rename = "models", default)]
    pub Models: Vec<String>,
}

/// Every provider the user has added, plus the single model in use (D-076).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProviderBook {
    #[serde(rename = "providers", default)]
    pub Providers: Vec<StoredProviderProfile>,
    #[serde(rename = "activeProviderId", default)]
    pub ActiveProviderId: Option<String>,
    #[serde(rename = "activeModel", default)]
    pub ActiveModel: Option<String>,
}

/// The pre-multi-provider blob. Kept only so an existing install can migrate
/// instead of losing its credential on upgrade.
#[derive(Debug, Deserialize)]
struct LegacyProvider {
    #[serde(rename = "baseUrl")]
    BaseUrl: String,
    #[serde(rename = "model")]
    Model: String,
    #[serde(rename = "apiKey")]
    ApiKey: String,
    #[serde(rename = "protocol", default)]
    Protocol: Protocol,
}

impl ProviderBook {
    /// Drops a dangling pointer instead of leaving the app on "nothing active".
    pub fn normalize(mut self) -> Self {
        self.Providers.retain(|provider| !provider.Id.is_empty());
        let active = self
            .ActiveProviderId
            .as_ref()
            .and_then(|id| self.Providers.iter().find(|provider| &provider.Id == id));
        match active {
            Some(provider) => {
                let model_ok = self
                    .ActiveModel
                    .as_ref()
                    .map(|model| provider.Models.iter().any(|known| known == model))
                    .unwrap_or(false);
                if !model_ok {
                    self.ActiveModel = provider.Models.first().cloned();
                }
            }
            None => {
                self.ActiveProviderId = self.Providers.first().map(|provider| provider.Id.clone());
                self.ActiveModel = self
                    .ActiveProviderId
                    .as_ref()
                    .and_then(|id| self.Providers.iter().find(|provider| &provider.Id == id))
                    .and_then(|provider| provider.Models.first().cloned());
            }
        }
        self
    }
}

fn migrate_legacy(legacy: LegacyProvider) -> ProviderBook {
    let profile = StoredProviderProfile {
        Id: "legacy".to_string(),
        Name: "默认供应商".to_string(),
        BaseUrl: legacy.BaseUrl,
        ApiKey: legacy.ApiKey,
        Protocol: legacy.Protocol,
        Models: if legacy.Model.is_empty() {
            Vec::new()
        } else {
            vec![legacy.Model.clone()]
        },
    };
    ProviderBook {
        ActiveModel: Some(legacy.Model),
        ActiveProviderId: Some(profile.Id.clone()),
        Providers: vec![profile],
    }
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

pub fn save(app: &tauri::AppHandle, book: &ProviderBook) -> Result<(), String> {
    let json = serde_json::to_vec(&book.clone().normalize()).map_err(|error| error.to_string())?;
    let cipher = platform::protect(&json)?;
    std::fs::write(blob_path(app)?, cipher).map_err(|error| format!("写入失败：{}", error))
}

pub fn load(app: &tauri::AppHandle) -> Result<Option<ProviderBook>, String> {
    let path = blob_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    let cipher = std::fs::read(&path).map_err(|error| format!("读取失败：{}", error))?;
    let plain = platform::unprotect(&cipher)?;
    // Shape sniffing beats a version field here: the only two shapes that ever
    // existed are "providers array" and the old flat record. Checking the key
    // first matters, because the new shape deserializes successfully from the
    // old one (every field has a default) and would silently drop the key.
    let value: serde_json::Value =
        serde_json::from_slice(&plain).map_err(|error| format!("配置已损坏：{}", error))?;
    if value.get("providers").is_some() {
        let book: ProviderBook =
            serde_json::from_value(value).map_err(|error| format!("配置已损坏：{}", error))?;
        return Ok(Some(book.normalize()));
    }
    let legacy: LegacyProvider =
        serde_json::from_value(value).map_err(|error| format!("配置已损坏：{}", error))?;
    Ok(Some(migrate_legacy(legacy).normalize()))
}

pub fn clear(app: &tauri::AppHandle) -> Result<(), String> {
    let path = blob_path(app)?;
    if path.exists() {
        std::fs::remove_file(path).map_err(|error| format!("删除失败：{}", error))?;
    }
    Ok(())
}
