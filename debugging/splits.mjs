import alignWordsplits from './aligner.mjs';

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
    
    const warnings = document.createElement('div');
    warnings.id = 'popup-warnings';
    const output = document.createElement('div');
    output.id = 'popup-output';

    container.appendChild(container1);
    container.appendChild(container2);

    popup.appendChild(selector);
    popup.appendChild(container);
    popup.appendChild(button);
    popup.appendChild(warnings);
    popup.appendChild(output);

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

const alignSplits = () => {
    const popup = document.querySelector('.popup');
    popup.style.height = '80%';
    popup.querySelector('.boxen').style.height = 'unset';

    const inputs = popup.querySelectorAll('textarea');
    const tam = inputs[0].value.trim().split(/\s+/);
    const eng = inputs[1].value.trim().split(/\s+/);
    const blockid = popup.querySelector('select').value;

    const textblock = document.getElementById(blockid).querySelector('.text-block');
    const text = textblock.textContent.replaceAll(/[\u00AD\s]/g,'');
    const ret = alignWordsplits(text,tam,eng);
    /*
    const concated = tam.replace(/\s+/g,' ');
    const aligned = NeedlemanWunsch(text,concated);
    const splits = alignmentToSplits(aligned,eng.split(/\s+/g));
    const id = textblock.closest('[id]').id;
    
    const ret = `<standOff corresp="#${id}" type="wordsplit">\n` + 
        makeEntries(splits).join('\n') +
        '\n</standOff>';
    */
    const warnings = document.getElementById('popup-warnings');
    warnings.innerHTML = '';
    for(const warning of ret.warnings) {
        const div = document.createElement('div');
        div.innerHTML = warning;
        warnings.append(div);
    }
    if(warnings.innerHTML !== '')
        warnings.style.visibility = 'visible';
    else
        warnings.style.visibility = 'hidden';

    const output = document.getElementById('popup-output');
    output.innerHTML = '';
    output.style.display = 'block';
    output.style.border = '1px solid black';
    const html = ret.xml ? 
        Prism.highlight(`<standOff type="wordsplit" corresp="#${blockid}">\n${ret.xml}\n</standOff>`, Prism.languages.xml,'xml') : 
        '';
    output.innerHTML = html;

    popup.querySelector('button').innerHTML = 'Re-align';
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
