const Puppeteer = require('puppeteer');
const ScrapeFaqs = require('./ScrapeFaq.js');
const fs = require('fs');

const targets = ['https://appleid.apple.com/faq/#!&page=faq', 'https://www.ugrad.vcu.edu/why/faqs/admissions.html'];
const output = 'FAQs.json';

let faqs = [];

const grabFAQs = function(question) {
  Puppeteer.launch().then((browser) => {
    Promise.all(targets.map(i => new Promise((resolve, reject) => {
      browser.newPage().then((page) => {
        page.goto(i).then(() => {
          page.evaluate(ScrapeFaqs).then(details => {
            resolve(details);
          });
        }).catch(console.error);
      }).catch(console.error);
    }))).then(resolvedFaqs => {
      resolvedFaqs.forEach(faq => faqs = faqs.concat(faq));
      let faqStr = JSON.stringify(faqs);
      fs.writeFile(output, faqStr, e => e ? console.error(e) + browser.close() : browser.close());
    }).catch(console.error);
  }).catch(console.error);
};

grabFAQs();
