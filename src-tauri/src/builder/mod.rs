//! Everything Builder Mode needs from the machine: reading and writing the
//! authoring workspace, running a command in the user's own shell, converting a
//! source document to Markdown, and reporting what the machine can run.
//!
//! The workspace root comes from the frontend on every call. It is the folder
//! the user picked, so it is trusted as a *root* and nothing more: every path
//! the model hands in is resolved against it and refused if it leaves.

pub mod convert;
pub mod env;
pub mod files;
pub mod install;
pub mod paths;
pub mod shell;
