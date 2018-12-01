
extern crate termion;

use std::fs::OpenOptions;
use std::io::{
    self, 
    Write, 
    Stdout, 
    stdout, 
    stdin,
    BufReader,
}; 

use std::env;
use std::process::exit;
use termion::input::TermRead;
use termion::event::Key;
use termion::raw::{IntoRawMode, RawTerminal};

struct Editor {
    cx: usize,
    cy: usize,
    stdout: RawTerminal<Stdout>,
    screenrows: usize,
    screencols: usize,
    numrows: usize,
    row: Option<Row>,
}

struct Row {
    size: usize,
    chars: String,
}

impl Editor {
    fn new() -> io::Result<Editor> {
        let stdout = stdout().into_raw_mode().unwrap();
        let (xsize, ysize) = termion::terminal_size().unwrap();

        Ok(Editor {
            cx: 0,
            cy: 0,
            stdout: stdout,
            screenrows: ysize as usize,
            screencols: xsize as usize,
            numrows: 0,
            row: None,
        })
    }

    fn open(&mut self, filename: String) {

        let f = OpenOptions::new().append(true)
                                    .read(true)
                                    .create(true)
                                    .open(filename);
        let mut reader = BufReader::new(f.unwrap());

        let line: String = reader.read_line().unwrap().expect("read_line error");
        let mut linelen = line.len();

        while linelen > 0 && line.as_bytes()[linelen - 1] as char == '\n' {
            linelen -= 1; 
        }

        let row = Row {
            size: linelen,
            chars: line.to_string(),
        };

        self.row = Some(row);
        self.numrows = 1;
        
    }

    fn draw_rows(&mut self, buf: &mut String) {

        for y in 0..self.screenrows {

            if y >= self.numrows {
                if y == self.screenrows / 3 {
                    let welcome = "Vint Editor";

                    if welcome.len() > self.screencols{
                        let (first_str, _last_str) = welcome.split_at(self.screencols);

                        let mut padding = (self.screencols - first_str.len()) / 2;
                        if padding != 0 {
                            buf.push_str("~");
                            padding -= 1;
                        }

                        while padding != 0 {
                            padding -= 1;
                            buf.push_str(" ");
                        }

                        buf.push_str(first_str);

                    } else {

                        let mut padding = (self.screencols - welcome.len()) / 2;
                        if padding != 0 {
                            buf.push_str("~");
                            padding -= 1;
                        }

                        while padding != 0 {
                            padding -= 1;
                            buf.push_str(" ");
                        }

                        buf.push_str(welcome);
                    }
            
                } else {
                    buf.push_str("~");
                }
            } else {
                // let mut len = &self.row.unwrap().size;
                // if len > &self.screencols {len = &self.screencols;}
                buf.push_str(&self.row.as_ref().unwrap().chars);
            }

            buf.push_str(format!("{}", termion::clear::UntilNewline).as_str());

            if y < self.screenrows - 1 {
                buf.push_str("\r\n");
            }
        }
    }


    fn refresh_screen(&mut self) {

        let mut buf = String::new();

        buf.push_str(format!("{}", termion::cursor::Hide).as_str());
        buf.push_str(format!("{}", termion::cursor::Goto(1, 1)).as_str());

        self.draw_rows(&mut buf);

        buf.push_str(format!("{}", termion::cursor::Goto((self.cy + 1) as u16, (self.cx + 1) as u16)).as_str());

        buf.push_str(format!("{}", termion::cursor::Show).as_str());

        write!(self.stdout, "{}", buf);

    }

    fn move_cursor(&mut self, key: Key) {
        match key {
            Key::Up => {
                if self.cx != 0 {
                    self.cx -= 1;
                }
            },

            Key::Left => {
                if self.cy != self.screenrows - 1 {
                    self.cy += 1;
                }
            },

            Key::Right => {
                if self.cy != 0 {
                    self.cy -= 1;
                }
            },

            Key::Down => {
                if self.cy != self.screencols - 1 {
                    self.cy += 1;
                }
            },

            _ => {}
        } 
    }

    fn process_keypress(&mut self) {
    
        let stdin = stdin();

        for c in stdin.keys() {
            let key = c.unwrap();
            match key {
                Key::Ctrl('q') => {
                    write!(self.stdout, "{}{}", termion::clear::All, termion::cursor::Goto(1, 1));
                    self.stdout.flush().unwrap();
                    exit(0);
                },

                Key::Home => self.cx = 0,
                Key::End => self.cx = self.screencols - 1,

                Key::PageUp | Key::PageDown => {
                    let mut times = self.screenrows;
                    while times != 0 {
                        times -= 1;
                        self.move_cursor(if key == Key::PageUp {Key::Up} else {Key::Down});
                    }
                },

                Key::Up | Key::Down | Key::Right | Key::Left => self.move_cursor(key),

                _ => {}
            }
        }

    }
}


fn main() {
    let file = env::args().nth(1).expect("Missing Argument");

    let mut editor = Editor::new().unwrap();
    editor.open(file);

    loop {
        editor.refresh_screen();
        editor.process_keypress();
    }

}
