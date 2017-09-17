module.exports = function ScrapeFaq() {
  class FaqScapper {
    constructor(target=document.body) {
      this.target = target;
    }
    containsTextNode(elem, tolerance=5) {
      return Array.from(elem.childNodes).filter(i => i.nodeType == 3)
        .map(i => i.textContent.trim()).join('').length > tolerance;
    };
    getLeafTextElements() {
      return Array.from(document.querySelectorAll('*'))
        .filter(i => ![
          'script',
          'noscript',
          'style',
          'iframe',
          'object',
          'audio',
          'video',
          'canvas',
          'img'
        ].includes(i.tagName.toLowerCase())
        && this.containsTextNode(i));
    };
    getQuestions(node) {
      return this.getLeafTextElements().filter(i => i.innerText.includes('?'));
    };
    getAnswersToQuestion(questions) {
      let questionAnswers = [];
      questions.forEach(e => {
        let minY = e.getBoundingClientRect().y;
        let maxY = Infinity;
        let minX = e.getBoundingClientRect().x - 1;
        let maxX = minX + 36;
        for (let elem of questions) {
          if (elem.getBoundingClientRect().y > minY && elem.getBoundingClientRect().y < maxY) {
            maxY = elem.getBoundingClientRect().y;
          }
        }
        let elements = this.getLeafTextElements()
          .filter(i => i.getBoundingClientRect().x >= minX
            && i.getBoundingClientRect().x <= maxX
            && i.getBoundingClientRect().y > minY
            && i.getBoundingClientRect().y < maxY
            && questions.filter(questionElement => questionElement.contains(i)).length == 0);
        if (elements.map(i => i.innerText.trim()).join('').length > 1) {
          questionAnswers.push({
            question: e.innerText.toLowerCase().replace(/[^\w\']/g, ' ').trim(),
            answer: elements.map(i => i.innerText.trim()).join('\n'),
            source: location.host
          });
        }
      });
      return questionAnswers;
    };
    getFaqs() {
      return this.getAnswersToQuestion(this.getQuestions(this.target));
    }
  }
  return (new FaqScapper()).getFaqs();
}
