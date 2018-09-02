
extern crate termion;

use std::env;
use std::io::{ Write, stdout };
use termion::raw::IntoRawMode;

mod vint;

fn main() {

    let args = env::args().collect();
    let mut stdout = stdout().into_raw_mode().unwrap();

    if args.length >= 2 {
        vint::editor_open(args);
    } else {
        vint::editor_open(None);
    }

    vint::editorSetStatusMessage("HELP: Ctrl-S = save | Ctrl-Q = quit | Ctrl-F = find");

    loop {
        vint::editor_refresh();
        vint::editor_process_key();
    }

}
