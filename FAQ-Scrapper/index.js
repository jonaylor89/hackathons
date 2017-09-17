const Puppeteer = require('puppeteer');
const ScrapeFaqs = require('./ScrapeFaq.js');
const fs = require('fs');

const targets = [
  'https://mlh.io/faq',
  'https://www.google.com/about/datacenters/faq/',
  'https://www.google.com/policies/faq/',
  'http://www.dell.com/learn/us/en/22/consumer-faq',
  'https://admission.virginia.edu/faq',
  'https://appleid.apple.com/faq/#!&page=faq',
  'https://www.ugrad.vcu.edu/why/faqs/admissions.html',
  'https://www.ugrad.vcu.edu/why/faqs/activities.html',
  'https://www.ugrad.vcu.edu/why/faqs/dining.html',
  'https://www.ugrad.vcu.edu/why/faqs/enrollment.html',
  'https://www.ugrad.vcu.edu/why/faqs/financing.html',
  'https://www.ugrad.vcu.edu/why/faqs/health.html',
  'https://www.ugrad.vcu.edu/why/faqs/housing.html',
  'https://www.ugrad.vcu.edu/why/faqs/libraries.html',
  'https://www.ugrad.vcu.edu/why/faqs/transfers.html',
  'https://www.ugrad.vcu.edu/why/faqs/transportation.html'
];
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
