const Puppeteer = require('puppeteer');

const target = 'https://www.ugrad.vcu.edu/why/faqs/admissions.html';

const grabFAQs = function(question) {
  puppeteer.launch().then((browser) => {
    browser.newPage().then((page) => {
      page.goto(target).then(() => {
        page.evaluate(function() {
          // return code
        });
        browser.close();
      });
    });
  });
};
