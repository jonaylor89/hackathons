use std::time;
use std::io::{self, stdout, stdin, File, BufReader}; 
use termion::{self, color, style, cursor}
use termion::event::{Key, Event};

fn syntax_color(hl: i32) {
    match hl {
        COMMENT | MLCOMMENT => return 36;
        KEYWORD1 => return 33;
        KEYWORD2 => return 34;
        STRING => return 35;
        NUMBER => return 31;
        MATCH => return 34;
        _ => return 37;
    }
}

struct Row {
    idx: i32,
    size: i32,
    rsize: i32,
    chars: Option<&Vec<char>>,
    render: Option<&Vec<char>>,
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

impl Row {

    fn update(self) {
        let mut tabs = 0;
            for i in 0..row.size {
                if row.chars[i] == '\t' {
                    tabs += 1; 
                } 
            }

            let mut idx = 0;
            for j in 0..row.size {
                if row.chars[j] == '\t' {
                    row.render[idx] = ' ';
                    idx += 1;
                    while tdx % TAB_STOP != 0 {
                        row.render[idx] = ' ';
                        idx += 1;
                    }
                } else {
                    row.render[idx] = row.chars[j];
                    idx += 1;
                }
            }

            row.render[idx] = '\0';
            row.rsize = idx;
            self.update_syntax(row);
    }

    fn insert_char(self, at: i32, c: char) {
        if at < 0 || at > row.size { at = row.size; }

        row.chars[at + 1] = row.chars[at];
        row.size += 1;
        row.chars[at] = c;
    }

    fn delete_char(self, at: i32) {
        if at < 0 || at >= self.size { return; } 

        row.chars[at] = row.chars[at + 1];

        row.size -= 1;
    }

    fn append_str(self, s: str) {
        self.push_str(s);
    }

    fn cx_to_rx(self, cx: i32) -> i32{
    
        let rx = 0;

        for x in 0..cx {
            if self.chars[x] == '\t' {
                rx += (TAB_STOP - 1) - (rx % TAB_STOP)
            } 
            rx += 1;
        }

        return rx;
    }
    
    fn rx_to_cx(self, rx: i32) {
        
        let cur_rx = 0;

        for cx in 0..self.size {
            if self.chars[cx] == '\t' {
                cur_rx += (TAB_STOP - 1) - (cur_rx % TAB_STOP);
            } 
        }

        return cx;
    }

    fn update_syntax(self) {
    
    }
}

impl Editor {
    pub fn init() -> Editor {
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

        self.draw_rows(buf);
        self.draw_status_bar(buf);
        self.draw_message_bar(buf);

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

                Event::Key(Key::Left) => cursor::Left(),
                Event::Key(Key::Right) => cursor::Right(),
                Event::Key(Key::Up) => cursor::Up();
                Event::Key(Key::Down) => cursor::Down(),

                Event::Key(Key::PageUp) |
                Event::Key(Key::PageDown) => {
                     
                },

                _  => self.insert_char(evt);

            }
        }
    }

    fn save(self) {
        if Some(self.filename) {

            let buf = self.rows_to_string();

            let file = io::open(self.filename).write(true).create(true);

            write!(file, "{}", buf);

            self.dirty = 0;
            self.set_status_message("Written to disk");
            return;
        } else {
            self.filename = self.prompt("Save as: ");
            if self.filename == None {
                self.set_status_message("Save aborted");
                return;
            }
        }
    }

    fn find(self) {
        let saved_cx = self.cx;
        let save_cy = self.cy;
        let saved_coloff = self.coloff;
        let saved_rowoff = self.rowoff;

        let query = self.prompt("Search: {} (ESC/Arrows/Enter)", self.find_callback);

        self.cx = saved_cx;
        self.cy = saved_cy;
        self.coloff = saved_coloff;
        self.rowoff = saved_rowoff;
    }

    fn scroll(self) {
        self.rx = 0;
        if self.cy < self.numrows {
            self.rx = self.row[self.cy].cx_to_rx(self.cx);
        }

        if self.cy < self.rowoff {
            self.rowoff = self.cy; 
        }

        if self.cy >= self.rowoff + self.screenrows {
            self.rowoff = self.cy = self.screenrows + 1; 
        }

        if self.rx < self.coloff {
            self.coloff = self.rx; 
        }

        if self.rx >= self.coloff + self.screencols {
            self.coloff = self.rx + self.screencols + 1; 
        }
    }

    fn move_cursor(self, key: i32) {
        let row: Option<erow> = (self.cy >= self.numrows) ? None : &self.row[self.cy];

        match c {
            Event::Key(Key::Left) => {
                if self.cx != 0 {
                    self.cx -= 1; 
                } else if self.cy > 0{
                    self.cy -= 1;
                    self.cx = self.row[self.cy].size;
                }
            },

            Event::Key(Key::Right) => {
                if Some(row) && self.cx < row.size {
                    self.cx += 1; 
                } else if Some(row) && self.cx < row.size {
                    self.cy += 1;
                    self.cx = 0;
                }
            },
            
            Event::Key(Key::Up) => {
                if self.cy != 0 {
                    self.cy -= 1; 
                }
            },

           Event::Key(Key::Down) => {
                if self.cy < self.numrows {
                    self.cy += 1; 
                } 
           },

           _ => break;
        }

        row = (self.cy >= self.numrows) ? None : &self.row[self.cy];
        let rowlen = Some(row) ? row.size : 0;
        if self.cx > rowlen {
            self.cx = rowlen; 
        }
    }

    fn draw_rows(self, s: String) {
        for y in 0..self.screenrows {
             
        } 
    }

    fn draw_status_bar(self) {
    
    }

    fn delete_char(self) {
        if self.cy == self.numrows {
            return; 
        } 

        if self.cx == 0 && self.cy == 0 {
            return; 
        }

        if self.cx > 0 {
            self.row[self.cy].del_char(self.cx - 1);
        } else {
            self.cx = self.row[self.cy - 1].size;
            self.row[self.cy - 1].append_str(row.chars);
            self.del_row(self.cy);
            self. -= 1;
        }
    }

    fn insert_char(self, c: char) {
        if self.cy == self.numrows {
            self.insert_row(self.numrows, "") ;
            self.row[self.cy].insert_char(self.cx, c);

            self.cx += 1;
        } 
    }

    fn del_row(at: i32) {
        if at < 0 || at >= self.numrows { return; }     
        self.row[at] = self.row[at + 1];
        for j in at..self.numrows {
            self.row[j].idx -= 1;
        }

        self.numrows -= 1;
        self.dirty += 1;
    }

    fn insert_row(at: i32, s: str) {
        if at < 0 || at > self.numrows { return; } 

        self.row[at + 1] = self.row[at];

        for j in at+1..self.numrows {
            self.row[j].idx += 1; 
        }

        self.row[at].idx = at;
        self.row[at].chars = String::new();
        self.row[at].chars = s;

        self.row[at].rsize = 0;
        self.row[at].render = None;
        self.row[at].hl = None;
        self.row[at].hl_open_comment = 0;
        
        self.row[at].update();

        self.numrows += 1;
        self.dirty += 1;

    }

    fn insert_newline(self) {
        if self.cx != 0 {
            let row = &self.row[self.cy];
            self.insert_row(self.cy + 1, row.chars[self.cs]);
            row = &self.row[self.cy];
            row.size = self.cx;
            row.chars[row.size] = '\0';
            self.update_row(row);
        } else {
            self.insert_row(row);
        }

        self.cy += 1;
        self.cx = 0;
    }

    fn rows_to_string(buflen: &i32) -> String{
        let mut totlen = 0;
        
        for i in 0..self.numrows {
            totlen += self.row[i].size + 1; 
        }

        buflen = totlen;

        let buf = String::new();

        for j in 0..self.numrows {
            buf.push_str(self.row[j]);
            buf.push('\n');
        }

        return buf;
    }

    fn find_callback(query: str, key: i32) {
        static let mut last_match = -1; 
        static let mut direction = 1;

        static let mut saved_hl_line: i32;
        static let mut saved_hl: Option<String>;

        if Some(saved_hl) {
            self.row[saved_hl_line].hl = saved_hl;
            saved_hl = None;
        }

        match key {
            '\r' | '\x1b' => {
                last_match = 1;
                direction = 1;
            }, 
            Key::Right | Key::Down => {
                direction = 1; 
            },
            Key::Left | Key::Up {
                direction = -1; 
            },
            _ => {
                last_match = -1;
                direction = 1;
            }

            if last_match = -1 {
                direction = 1; 
            }

            let mut current = last_match;

            for i in 0..numrows {
                current += direction; 

                if current == -1 {
                    current = self.numrows - 1; 
                } else if current == self.numrows {
                    current = 0; 
                }
                
                let row = &self.row[current];

                let mat = row.render.find(query);
                
                if row.render.contains(query) {
                    last_match = current;
                    self.cy = current;
                    self.cx = row.rx_to_cx(mat - row.render);
                    self.rowoff = E.numrows;

                    saved_hl_line = current;
                    saved_hl = String::new();
                    saved_hl = row.hl;
                    row.hl[mat - row.render] = HL_MATCH;
                    break;
                }

            }
    }

    fn draw_status_bar(self s: &String) {

        let mut len = 0;
        let mut rlen = 0;

        s.push_str("\x1b[7m");

        let status = format!("{} - {} lines {}",
                             Some(self.filename) ? self.filename : "[No Name]",
                             self.numrows,
                             self.dirty > 0 ? "(modified)" : "");

        let rstatus = format!("{} | {}/{}", 
                              Some(self.syntax) ? self.syntax.filetype : "no ft",
                              self.cy + 1, self.numrows);

        if status.len > self.screencols {
            len = self.screencols;     
        }

        s.push_str(status);

        while len < self.screencols {
            if self.screencols - len == rlen {
                s.push_str(rstsatus);
                break;
            } else {
                s.push(' ');
                len += 1;
            }
        }

        s.push_str("\x1b[m");
        s.push_str("\r\n");
    }

    fn draw_message_bar(s: &mut String) {
        s.push_str("\x1b[K");

        let msglen = s.len();

        if msglen > self.screencols {
            msglen = self.screencols; 
        }

        if msglen && time::Instant::now() - self.statusmsg_time < 5 {
            s.push_str(self.status_msg, msglen);
        }
    }

    fn set_status_message(self, s: str) {
        self.statusmsg = format!(str);
        self.status_msg_time = time::Instant::now();
    }

    fn prompt(prompt: &str, Option<fn callback(&str, i32))> -> Option<str>{

        let buf = String::new();

        loop {
            self.set_status_message(prompt);
            self.refresh_screen();

            let stdin = stdin();
            for c in stdin.events() {
                let evt = c.unwrap();
                match evt {
                    Event::Key(Key::Delete) |
                    Event::Key(Key::Ctrl('h')) |
                    Event::Key(Key::Backspace) => {
                        if buflen != 0 {
                            buflen -= 1;
                            buf.char_at(buflen) = '\0';
                        }
                    },

                    Event::Key(Key::Char('\x1b')) => {
                        if buflen != 0 {
                            self.set_status_message("");
                            if Some(callback) {
                                callback(buf, c);
                            }

                            return None;
                        } 
                    }, 

                    Event::Key(Key::Char('\r')) => {
                        if buflen != 0 {
                            self.set_status_message("");
                            if Some(callback) {
                                callback(buf, c);
                            }

                            return buf;
                        }
                    }, 

                    Event::Key(Key::Ctrl()) => {
                        if c < 128 {
                            if buflen == bufsize - 1 {
                                bufsize *= 2;
                                buf[buflen] = '\0';
                            }

                            buf[buflen] = c;
                            buflen += 1;
                            buf[buflen] = '\0';
                        } 
                    },

                    _ => break;
                }  
            }

            if Some(callback) {
                callback(buf, c) ;
            }
       }  
    }

    fn select_syntax_highlight() {
         
    }
}

