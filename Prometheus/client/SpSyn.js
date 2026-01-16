var utterances = [];

const say = function(sentence) {
  return new Promise((resolve, reject) => {
    var utterThis = new SpeechSynthesisUtterance(sentence);
    utterances.push(utterThis);
    utterThis.voice = speechSynthesis.getVoices()[Math.floor(Math.random() * speechSynthesis.getVoices().length)];
    window.speechSynthesis.speak(utterThis);
    utterThis.onend = e => {
      resolve(e.elapsedTime);
    };
  });
};

const listen = function() {
  return new Promise((resolve, reject) => {
    var recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
    recognition.start();
    recognition.onresult = function(event) {
      resolve(event.results[0][0].transcript);
    };
  });
};

const similarity = function(s1, s2, first=true) {
  s1 = s1.split(' ');
  s2 = s2.split(' ');
  let hits = 0;
  for (let w1 of s1) {
    if (s2.includes(w1)) {
      hits++;
    }
  }
  if (first) {
    return (similarity(s2.join(' '), s1.join(' '), false) + hits / s1.length) / 2;
  } else {
    return hits / s1.length;
  }
};

const maxSimilarity = function(s1, a1) {
  let max = -Infinity;
  let index = -1;
  console.log(s1);
  for (let i = 0; i != a1.length; i++) {
    let sim = similarity(s1, a1[i]);
    if (sim > max) {
      max = sim;
      index = i;
    }
  }
  return {
    similarity: max,
    index
  };
};

let xhr = new XMLHttpRequest();
xhr.open('GET', 'https://raw.githubusercontent.com/jonaylor89/FAQ-Bot/master/FAQs.json', true);
xhr.onload = function() {
  let faqs = JSON.parse(xhr.responseText);
  document.querySelector('#ask').removeAttribute('disabled');
  document.querySelector('#ask').addEventListener('click', e => {
    document.querySelector('#ask').setAttribute('disabled', '');
    say('Welcome, how may I help you today?').then(() => {
      listen().then((question) => {
        let max = maxSimilarity(question.toLowerCase(), faqs.map(i => i.question));
        console.log({
          ...max,
          closestQuestion: faqs[max.index]
        });
        if (max.similarity > 0.7) {
          say(faqs[max.index].answer).then(t => {
            say('The source of this information is ' + faqs[max.index].source).then(t => {
              document.querySelector('#ask').removeAttribute('disabled');
            });
          });
        } else {
          say('I\'m sorry, but I do not know the answer right now.').then(t => {
            document.querySelector('#ask').removeAttribute('disabled');
          });
        }
      });
    });
  });
};
xhr.send();
