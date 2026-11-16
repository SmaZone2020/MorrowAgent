<div align="center">

# CI/CD · 持续集成与安装包发布

**How a push is verified and how a tag becomes a Windows installer.**

[![Reference](https://img.shields.io/badge/REFERENCE-6b7280?style=flat-square)](#) [![中文正文](https://img.shields.io/badge/%E6%AD%A3%E6%96%87-%E4%B8%AD%E6%96%87-2f6f5e?style=flat-square)](#)

</div>

> This document is written in Chinese. The title and summary above are the English entry point.

## 1. 两条流水线

| 工作流 | 触发 | 作用 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | 推送到 `main`、Pull Request、手动 | 类型检查、单测、生产构建、`clippy -D warnings`、`cargo test` |
| `.github/workflows/release.yml` | 推送 `v*` 标签、手动 | 校验版本号与分支后产出 `.msi` 与 NSIS 安装包，并**自动发布** Release |

两者都先跑一遍「便宜的检查」，再动编译：一个装不上的安装包比一个红叉更难收拾。

标签推送只触发 Release，不重复触发 CI——同一棵树编两遍没有意义；Release 自己会把 CI 的那套检查再跑一遍，所以标签无法绕过红线。

## 2. 为什么 Rust 任务跑在 Windows

- 只发布 Windows 安装包，Linux 任务编译出来的产物用户拿不到。
- `provider/secret.rs` 的 DPAPI 加密是 `#[cfg(target_os = "windows")]`，非 Windows 走的是「暂不支持」的桩。在 Linux 上跑测试等于测试那个桩。

## 3. 版本号只有一个来源

版本号被手写在五个文件里，因为每个工具链各读各的：

| 文件 | 谁在读 |
| --- | --- |
| `package.json` | pnpm / npm |
| `src-tauri/Cargo.toml` | Cargo |
| `src-tauri/tauri.conf.json` | Tauri 打包器（决定安装包文件名） |
| `src/app/config.ts` | 前端界面 |
| `src-tauri/src/package/mod.rs` | `APP_VERSION`，包安装时的 `min_app_version` 比较 |

`pnpm check:version` 断言五处一致；带 `--tag v0.2.0` 时还要求与发布标签一致。发布工作流在编译前调用它，所以「安装包叫 0.2.0、关于页写 0.1.0」这种错误进不了 Release。

改版本的顺序：改完五处 → `pnpm check:version` → 提交 → 打标签推送。

## 4. 发布流程

```bash
pnpm check:version                 # 五处一致
git commit -am "(chore)bump to 0.2.0"
git tag v0.2.0
git push origin main --tags
```

工作流随后：

1. `verify`：标签必须位于 `main` 的历史里（否则直接失败）；`--tag` 版本校验、类型检查、单测、前端构建、`clippy -D warnings`、`cargo test`。
2. `bundle`：`tauri-apps/tauri-action` 编译并打包，把 `.msi` 与 `-setup.exe` 挂到一个**草稿** Release 上；同一步之后再 `Upload installers`，把安装包另存为 workflow 产物（保留 30 天）。
3. `Publish the release`：确认草稿上 `.msi` 与 `-setup.exe` 两个资产都在，再执行 `gh release edit --draft=false`，Release 才对外公开。只有确实比当前 latest 新时才加 `--latest`，所以补发一个旧标签不会把「最新版本」指针往回调。

「草稿 → 公开」两段式而不是直接公开：tauri-action 创建 Release 与上传资产是一步完成的，如果构建中途失败，草稿会留在那里等人看，而不是一个资产缺失的公开版本。发布前的资产检查也是同一个意思——只产出了 `.msi` 的版本不该被当成可下载的正式版。

手动触发同一个工作流只跑 `pnpm tauri:build` 并上传产物，不创建也不修改 Release——这是演练用的路径。

## 5. 未签名的代价

当前构建不做代码签名，首次运行会触发 SmartScreen。签名需要一张证书和几个仓库 Secret，属于发布策略问题而不是代码问题，见 `docs/OPEN-QUESTIONS.md`。

因为发布是全自动的，签名缺失的影响更直接：用户点进 Release 就能下载，第一次运行会看到警告。发布说明里写明了「More info → Run anyway」，这一段必须随版本一起维护。

## 6. 全新克隆里会跳过的测试

`packages/` 与 `dist-packages/` 被 `.gitignore` 排除（内容授权未定），所以 CI 的检出里没有参考学习包。依赖它的测试用 `crate::package::sample_package()` 判断，缺失时打印 `skipped:` 并返回，而不是失败：

- `package::content::the_sample_package_loads_end_to_end`
- `package::manifest::the_sample_manifest_parses_and_checks_clean`
- `package::tests::a_sample_package_round_trips_through_export_and_install`
- `package::tests::installing_a_newer_version_replaces_the_old_tree`
- `package::tests::a_tampered_package_fails_the_integrity_check`
- `tests/shipped_archive.rs`

包引擎本身的逻辑仍由测试自己造的 fixture 覆盖；跳过的只是「真实样例能装」这一条。要本地验证它，先 `node scripts/mlps/pack.mjs` 产出 `.morrow`，再跑 `cargo test`。

## 7. 内容管线不在 CI 里

`pnpm validate:knowledge` 与 `pnpm build:knowledge` 读 `data/yaml/`，该目录与 `packages/` 一样因授权未定被排除。CI 不跑这两条命令，`pnpm build` 也不依赖它们的产物（前端运行时读的是已安装学习包，不是 `data/json/knowledge.json`）。因此检出里没有源文件也能构建出完整安装包——只是安装包里不带任何内置内容。
