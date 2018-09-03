
use std::time;
use std::io::{self, stdout, stdin, File, BufReader}; 
use termion::{self, color, style, cursor}
use termion::event::{Key, Event};

struct EditorRow {

}

struct Editor {
    cx: i32,
    cy: i32,
    rx: i32,
    rowoff: i32,
    coloff: i32,
    screenrows: i32,
    screencols: i32,
    numrows: i32,
    row: Option<erow>,
    dirty: i32,
    filename: &str,
    statusmsg: Option<&str>,
    statusmsg_time: Option<&time::Instant>,
};

impl Editor {
    pub fn new() -> Editor {
        let mut e = Editor {
            cx = 0,
            cy = 0,
            rx = 0,
            rowoff = 0,
            coloff = 0,
            numrows = 0,
            row = None,
            dirty = 0,
            filename = String::new(),
            statusmsg = String::new(),
            statusmsg_time = time::Instant::now(),
        };

        e.screenrows, e.screencols = termion::terminal_size().unwrap();

        return e;
    }

    pub fn open(self, filename: Option<String>) {
 
        if Some(filename) {
            let file = File::open(filename)?;
        } else {
            let file = File::new("untitled")?;  
        }

        let mut reader = BufReader::new(file);
        let mut line = String::new();
        let mut linelen = file.read_line(&mut line);

        while (linelen = file.read_line(&mut line)) != 0 {
            while linelen > 0 && (line.char_at(linelen-1) == '\n' || line.char_at[linelen-1] == '\r') {
                self.insert_row(line, linelen);
            }
        }

        self.dirty = 0;
    }

    pub fn refresh_screen(self) {
    
        self.scroll();

        let buf = String::new();
        let stdout = stdout().into_raw_mode().unwrap();

        buf.push_str(cursor::Hide());
        buf.push_str(cursor::Goto(1, 1));

        self.draw_rows();
        self.draw_status_bar();
        self.draw_message_bar();

        buf.push_str(cursor::Goto((self.cy - self.rowoff) + 1, (self.rw - self.coloff) + 1));
        buf.push_str(cursor::Show());

        stdout.write(buf.as_bytes());
    }

    pub fn process_keypress(self) {
        let stdin = stdin();

        for c in stdin.events() {
            let evt = c.unwrap();
            match evt {
                Event::Key(Key::Ctrl('s')) => self.save(),
                Event::Key(Key::Ctrl('f')) => self.find(),

                Event::Key(Key::Ctrl('l')) => break, 
                Event::Key(Key::Esc) => break,

                Event::Key(Key::Ctrl('h')) |
                Event::Key(Key::Backspace) |
                Event::Key(Key::Delete) => {
                    if evt == Event::Key(Key::Delete) {
                        cursor::Right();
                    }

                    self.delete_char();
                },

                Event::Key(Key::Left) => return cursor::Left(),
                Event::Key(Key::Right) => return cursor::Right(),
                Event::Key(Key::Up) => return cursor::Up();
                Event::Key(Key::Down) => return cursor::Down(),

                Event::Key(Key::PageUp) |
                Event::Key(Key::PageDown) => {
                     
                },

                _  => self.insert_char();

            }
        }
    }

    fn scroll(self) {
    
    }

    fn draw_rows(self) {
    
    }

    fn draw_status_bar(self) {
    
    }
}

