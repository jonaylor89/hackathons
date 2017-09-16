const Puppeteer = require('puppeteer');
const FaqScrapper = require('./FaqScrapper.js');
const fs = require('fs');

const target = ['https://www.ugrad.vcu.edu/why/faqs/admissions.html'];
const output = '~/FAQ-Bot/FAQs.json';

let faqs = {};

const grabFAQs = function(question) {
  Puppeteer.launch().then((browser) => {
    browser.newPage().then((page) => {
      Promise.all(target.map(i => new Promise(function() {
        page.goto(i).then((resolve, reject) => {
          page.evaluate(function(FaqScrapper) {
            'use strict';
            let faq = (new FaqScrapper()).getFaqs();
            faqs = {
              faq,
              ...faqs
            };
            resolve();
          }.bind(this, FaqScrapper));
        }).catch(console.error);
      }))).then(i => {
        let faqStr = JSON.stringify(faqs);
        fs.writeFile(output, faqStr, console.error);
        browser.close();
      }).catch(console.error);
    }).catch(console.error);
  }).catch(console.error);
};

grabFAQs();
