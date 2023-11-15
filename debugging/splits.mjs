import { alignWordsplits, tamilSplit } from './aligner.mjs';

const addWordSplits = () => {
    showPopup();     
};

const showPopup = () => {
    const popup = document.createElement('div');
    popup.className = 'popup';
   
    const selector = document.createElement('select');
    selector.setAttribute('name','edblock');
    for(const lg of document.querySelectorAll('.lg')) {
        if(!lg.id) continue;
        const option = document.createElement('option');
        option.value = lg.id;
        option.append(lg.id);
        selector.append(option);
    }

    const container = document.createElement('div');
    container.className = 'boxen';

    const wordsplitlabel = document.createElement('label');
    wordsplitlabel.append('Tamil wordsplit');
    const wordsplit = document.createElement('textarea');
    wordsplit.setAttribute('contenteditable', true);
    const container1 = document.createElement('div');
    container1.appendChild(wordsplitlabel);
    container1.appendChild(wordsplit);

    const translationlabel = document.createElement('label');
    translationlabel.append('Word-by-word translation');
    const translation = document.createElement('textarea');
    translation.setAttribute('contenteditable', true);
    const container2 = document.createElement('div');
    container2.appendChild(translationlabel);
    container2.appendChild(translation);
    
    const button = document.createElement('button');
    button.setAttribute('type','button');
    button.append('Align');
    button.addEventListener('click',alignSplits);

    const container3 = document.createElement('div');
    container3.id = 'output-boxen';
    const warnings = document.createElement('div');
    warnings.id = 'popup-warnings';
    const output = document.createElement('div');
    output.id = 'popup-output';
    container3.appendChild(output);
    container3.appendChild(warnings);

    container.appendChild(container1);
    container.appendChild(container2);

    popup.appendChild(selector);
    popup.appendChild(container);
    popup.appendChild(button);
    popup.appendChild(container3);

    const blackout = document.createElement('div');
    blackout.id = 'blackout';
    blackout.append(popup);
    document.body.appendChild(blackout);
    blackout.addEventListener('click',(e) => {
        const targ = e.target.closest('.popup');
        if(!targ)
            document.querySelector('#blackout').remove();
    });
};

const wordClean = (str) => {
    return str.replaceAll(/\/[aāiīuūeēoōkṅcñṭṇtnpmyrlvḻḷṟṉ]+\s/g,'')
              .replaceAll(/\s/g,'');
};

const checkEquality = (str1, str2) => {
    if(typeof str1 !== 'string' || typeof str2 !== 'string')
        return 'mismatch';
    if(str1 === str2)
        return null;
    if([';','.',','].includes(str1) && str2 === '')
        return null;
    if(str2 === '')
        return 'typo';
    if(str2 === '~') {
        if(['y','v'].includes(str1)) return null;
        else return 'typo';
    }
    if(str2 === '+') {
        if(['k','c','t','p','m','l','ḷ','v','ṉ'].includes(str1)) return null;
        else return 'typo';

    }
    if(str2 === '*' || str2 === "'") {
        if(str1 !== '')
            return 'typo';
        else return null;
    }
    if(str2 === '-') {
        if(str1 !== '') return 'typo';
        else return null;
    }

    return 'mismatch';

};

const alignSplits = () => {
    const popup = document.querySelector('.popup');
    popup.style.height = '80%';
    popup.querySelector('.boxen').style.height = 'unset';

    popup.querySelector('button').innerHTML = 'Re-align';

    const inputs = popup.querySelectorAll('textarea');
    const tam = inputs[0].value.trim().split(/\s+/);
    const eng = inputs[1].value.trim().split(/\s+/);

    document.getElementById('output-boxen').style.display = 'flex';

    const output = document.getElementById('popup-output');
    output.innerHTML = '';

    const warnings = document.getElementById('popup-warnings');
    warnings.innerHTML = '';

    const tamlines = inputs[0].value.trim().split(/\n+/);
    const englines = inputs[1].value.trim().split(/\n+/);
    for(let n=0;n<tamlines.length;n++) {
        if(tamlines[n].trim().split(/\s+/).length !== englines[n].trim().split(/\s+/).length) {
            
            warnings.innerHTML = (`<div>Line ${n+1}: Tamil & English don't match.</div>`);
            output.style.border = 'none';
            output.style.display = 'none';
            return;
        }
    }

    const blockid = popup.querySelector('select').value;

    const textblock = document.getElementById(blockid).querySelector('.text-block');
    const text = textblock.textContent.replaceAll(/[\u00AD\s]/g,'');
    const ret = alignWordsplits(text,tam,eng);

    let charcounts = tamlines.reduce((acc,cur) => {
        const i = tamilSplit(wordClean(cur)).length;
        if(acc.length > 0)
            acc.push(acc[acc.length-1] + i);
        else acc.push(i - 1);
        return acc;
    },[]);

    if(ret.alignment) {
        let atab = document.createElement('table');
        let row1 = document.createElement('tr');
        let row2 = document.createElement('tr');
        let nn = 0;
        for(let n=0;n<ret.alignment[0].length;n++) {
            const unequal = checkEquality(ret.alignment[0][n],ret.alignment[1][n]);
            let td1;
            if(typeof ret.alignment[0][n] === 'string') {
                td1 = document.createElement('td');
                td1.append(ret.alignment[0][n]);
                if(ret.alignment[0][n + 1] === Symbol.for('concatleft') ||
                   ret.alignment[0][n - 1] === Symbol.for('concatright')) {
                    td1.colSpan = '2';
                    td1.classList.add('mismatch');
                }
                else if(unequal) td1.classList.add(unequal);
                row1.appendChild(td1);
            }
            if(typeof ret.alignment[1][n] === 'string') {
                const td2 = document.createElement('td');
                td2.append(ret.alignment[1][n]);
                if(ret.alignment[1][n + 1] === Symbol.for('concatleft') ||
                   ret.alignment[1][n - 1] === Symbol.for('concatright')) {
                    td2.colSpan = '2';
                    td2.classList.add('mismatch');
                }
                else if(unequal) td2.classList.add(unequal);
                else if(td1?.classList.contains('mismatch')) td2.classList.add('mismatch');
                row2.appendChild(td2);
            }

            if(charcounts.includes(nn)) {
                atab.appendChild(row1);
                atab.appendChild(row2);
                warnings.appendChild(atab);
                atab = document.createElement('table');
                row1 = document.createElement('tr');
                row2 = document.createElement('tr');
            }
            if(typeof ret.alignment[1][n] === 'string' && ret.alignment[1][n] !== '') nn++;
        }
        atab.appendChild(row1);
        atab.appendChild(row2);
        warnings.appendChild(atab);
    }

    output.style.display = 'block';
    output.style.border = '1px solid black';
    const html = ret.xml ? 
        Prism.highlight(`<standOff type="wordsplit" corresp="#${blockid}">\n${ret.xml}\n</standOff>`, Prism.languages.xml,'xml') : 
        '';
    output.innerHTML = html;
    
    if(ret.xml) {
        navigator.clipboard.writeText(`<standOff type="wordsplit" corresp="#${blockid}">\n${ret.xml}\n</standOff>`).then(
            () => {
                const par = document.getElementById('popup-output');
                const tip = document.createElement('div');
                tip.style.position = 'absolute';
                tip.style.top = 0;
                tip.style.right = 0;
                tip.style.background = 'rgba(0,0,0,0.5)';
                tip.style.color = 'white';
                tip.style.padding = '0.5rem';
                tip.append('Copied to clipboard.');
                par.appendChild(tip);
                tip.animate([
                    {opacity: 0},
                    {opacity: 1, easing: 'ease-in'}
                    ],200);
                setTimeout(() => tip.remove(),1000);
            },
            () => {
                const par = document.getElementById('popup-output');
                const tip = document.createElement('div');
                tip.style.position = 'absolute';
                tip.style.top = 0;
                tip.style.right = 0;
                tip.style.background = 'rgba(0,0,0,0.5)';
                tip.style.color = 'red';
                tip.style.padding = '0.5rem';
                tip.append('Couldn\'t copy to clipboard.');
                par.appendChild(tip);
                setTimeout(() => tip.remove(),1000);
            }
        );
    }
};

const addcsvwordsplit = (e) => {
    Papa.parse(e.target.files[0], {
        complete: (res) => {
            const data = res.data;
            if(data[0][0] === 'Word') data.shift();
            showsplits(data);
        }
    });
};

const showsplits = (arr) => {
    const concated = arr.map(el => el[0]).join(' ');
    const textblock = document.querySelector('.text-block');
    const text = textblock.textContent.replaceAll('\u00AD','');
    const aligned = NeedlemanWunsch(text,concated);
    const splits = alignmentToSplits(aligned,arr.map(el => el[1]));
    const id = textblock.closest('[id]').id;
    
    const ret = `<standOff corresp="#${id}" type="wordsplit">\n` + 
        makeEntries(splits).join('\n') +
        '\n</standOff>';

    makepopup(ret);
};
/*
const makepopup = (str) => {
    const popup = document.createElement('div');
    popup.className = 'popup';
    const code = document.createElement('code');
    code.className = 'language-xml';
    code.style.whiteSpace = 'pre';
    code.append(str);
    popup.append(code);
    const blackout = document.createElement('div');
    blackout.id = 'blackout';
    blackout.append(popup);
    Prism.highlightAllUnder(popup);
    document.body.appendChild(blackout);
    blackout.addEventListener('click',(e) => {
        const targ = e.target.closest('.popup');
        if(!targ)
            document.querySelector('#blackout').remove();
    });
};
*/

const alignmentToSplits = (aligned, translations) => {
    let words = [];
    let wordstart = 0;
    let wordend = 0;
    let curword = '';
    for(let n=0; n<aligned[0].length;n++) {
        if(aligned[1][n].match(/[\n\s]/)) {
            const ret = {word: curword, start: wordstart, end: wordend};
            const translation = translations.shift();
            if(translation) ret.translation = translation;
            words.push(ret);

            curword = '';
            if(aligned[0][n].match(/[\n\s]/))
                wordstart = wordend + 1;
            else wordstart = wordend;
        }
        else {
            if(curword === '' && aligned[0][n].match(/[\n\s]/))
                wordstart = wordend + 1;
            curword += aligned[1][n];
        }

        if(aligned[0][n] !== '') wordend += 1;
    }
    if(curword) { // might be "" if wordsplit is only partial
        const ret = {word: curword, start: wordstart, end: wordend};
        const translation = translations.shift();
        if(translation) ret.translation = translation;
        words.push(ret);
    }

    return words;
};
const makeEntries = (list) => {
    const formatWord = (w) => {
        return w.replace(/([~+()])/g,'<pc>$1</pc>')
                .replaceAll(/['’]/g,'<pc>(</pc>u<pc>)</pc>')
                //.replaceAll(/\[(.+?)\]/g,'<supplied>$1</supplied>');
                .replaceAll(/\[(.+?)\]/g,'$1');
    };
    return list.map(e => {
        const select = e.hasOwnProperty('strand') ? ` select="${e.strand}"` : '';
        const translation = e.hasOwnProperty('translation') ? `\n    <def>${e.translation}</def>` : '';
        return `  <entry corresp="${e.start},${e.end}"${select}>\n    <form>${formatWord(e.word)}</form>${translation}\n</entry>`;
    });
};

export { addWordSplits };
