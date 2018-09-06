
extern crate termion;


use std::process::exit;
use std::io::{Write, stdout, stdin};

use termion::input::TermRead;
use termion::raw::IntoRawMode;
use termion::event::Key;


fn refresh_screen() {
    let mut stdout = stdout().into_raw_mode().unwrap();
    write!(stdout, "{}", termion::clear::All);

    stdout.flush().unwrap();
}

fn process_keypress() {
    
    let stdin = stdin();
    let mut stdout = stdout().into_raw_mode().unwrap();

    for c in stdin.keys() {
        let key = c.unwrap();
        match key {
            Key::Ctrl('q') => {
                exit(0);
            } ,

            _ => {}
        }
    }

}


fn main() {


    loop {
        refresh_screen();
        process_keypress();
    }

}
