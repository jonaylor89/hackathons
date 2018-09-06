
extern crate termion;


use std::process::exit;
use std::io::{Write, stdout, stdin};

use termion::input::TermRead;
use termion::raw::IntoRawMode;
use termion::event::Key;

struct editor {

}

fn draw_rows() {

    let mut stdout = stdout().into_raw_mode().unwrap();

    let (xsize, ysize) = termion::terminal_size().unwrap();

    for y in 0..ysize {
        write!(stdout, "~\r\n");
    }
}

fn refresh_screen() {
    let mut stdout = stdout().into_raw_mode().unwrap();
    write!(stdout, "{}{}", termion::clear::All, termion::cursor::Goto(1, 1));

    stdout.flush().unwrap();

    draw_rows();

    write!(stdout, "{}{}", termion::clear::All, termion::cursor::Goto(1, 1));

}

fn process_keypress() {
    
    let stdin = stdin();
    let mut stdout = stdout().into_raw_mode().unwrap();

    for c in stdin.keys() {
        let key = c.unwrap();
        match key {
            Key::Ctrl('q') => {
                write!(stdout, "{}{}", termion::clear::All, termion::cursor::Goto(1, 1));
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
