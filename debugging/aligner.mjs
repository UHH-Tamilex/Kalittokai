import needlemanWunsch from './needlemanwunsch.mjs';

const CONCATRIGHT = Symbol.for('concatright');
const CONCATLEFT = Symbol.for('concatleft');

const affixbare = ['amma','arō','ā','ār','āl','āl-amma','āl-illa','ikā','um','ē','ō','kol','kollō','kollē','koṉ','tilla','tillamma','teyya','maṟṟu','maṟṟē','ōmaṟṟē','maṟṟilla','maṉ','maṉṟilla','maṉṉō','maṉṉē','maṉṟa','maṉṟamma','mātu','mātō','māḷa','yāḻa'];
affixbare.sort((a,b) => b.length - a.length);

const affixes = affixbare.map(a => [a,new RegExp(`\\[?${a}\\]?$`)]);

affixes.push(['maṟṟu',new RegExp('^\\[?maṟṟ[u*\'’]\\]?')]);

const caseAffixes = [
    ['māṭṭu',{
        regex: /māṭṭ[’u]$/,
        gram: 'locative',
        translationregex: /\(loc\.\)$/
    }],
    ['mutal',{
        regex: /mutal$/,
        gram: 'locative',
        translationregex: /\(loc\.\)$/
    }],
    ['iṉ',{
        regex: /iṉ$/,
        gram: 'locative',
        translationregex: /\(loc\.\)$|iṉ$/
    }],
    ['iṉum',{
        regex: /iṉum$/,
        translationregex: /iṉum$/
    }],
    ['am',{
        regex: /am$/,
        translationregex: /am$/
    }],
    ['a',{
        regex: /a$/,
        translationregex: /a$/
    }],
    ['oṭu',{
        regex: /[oō]ṭ[u’*]$/,
        gram: 'sociative/instrumental',
        translationregex: /-with$/
    }],
    ['āṅku',{
        regex: /[aā]ṅk[u’*]$/,
        gram: 'comparative',
        translationregex: /-like$/
    }]
];
caseAffixes.sort((a,b) => b[0].length - a[0].length);

const gramAbbreviations = [
    ['(a.)','absolutive?'], // check
    ['(abs.)','absolutive'],
    ['(acc.)','accusative'],
    ['(adj.)','adjective'],
    ['(adv.)','adverb'],
    ['(comp.)','comparative'],
    ['(dat.)','dative'],
    ['(f.)','feminine'],
    ['(f.v.)','finite verb'],
    ['(gen.)','genitive'],
    ['(h.)','honorific'],
    ['(3.h.)','3rd person honorific'],
    ['(h.dat.)','honorific dative'],
    ['(h.loc.)','honorific locative'],
    ['(hab.fut.)','habitual future'],
    ['(i.a.)','imperfect aspect'],
    ['(id.)','ideophone'],
    ['(inf.)','infinitive'],
    ['(inst.)','instrumental'],
    ['(inter.pron.)','interrogative pronoun'],
    ['(ipt.)','imperative'],
    ['(ipt.pl.)','imperative plural'],
    ['(loc.)','locative'],
    ['(m.)','masculine'],
    ['(muṟ.)','muṟṟeccam'],
    ['(n.)','neuter'],
    ['(n.sg.)','neuter singular'],
    ['(n.pl.)','neuter plural'],
    ['(neg.)','negative'],
    ['(obl.)','oblique'],
    ['(opt.)','optative'],
    ['(p.)','peyareccam'],
    ['(p.a.)','perfective aspect'],
    ['(p.n.)','proper name'],
    ['(part.n.)','participial noun'],
    ['(pey.)','peyareccam'],
    ['(pl.)','plural'],
    ['(pl.sub.)','plural subjunctive'],
    ['(pron.n.)','pronominalised noun'],
    ['(sg.)','singular'],
    ['(soc.)','sociative'],
    ['(sub.)','subjuntive'],
    ['(suff.)','suffix'],
    ['(v.n.)','verbal noun'],
    ['(voc.)','vocative']
];

const wordsplitscore = (a,b) => {
    const vowels = 'aāiīuūoōeē'.split('');
    if(a === ' ' || b === ' ') return -2;
    if(b === '-') return -2;
    if(a === b) return 1;
    if(['y','v'].includes(a) && b === '~') return 1; // is this needed?
    if(vowels.includes(a) && vowels.includes(b)) return -0.5;
    return -1;
};

const warnTypos = (alignment) => {
    const ret = [];
    alignment[1].forEach((el, i) => {
        if(el === '') {
            const slice0 = alignment[0].slice(i-10,i+10).join('');
            const slice1 = alignment[1].slice(i-10,i).join('') + 
                '<mark>&nbsp;</mark>' +
                alignment[1].slice(i,i+10).join('');
            ret.push(`Missing sandhi: <span class="choice"><span>${slice0}</span><span>${slice1}</span></span>`);
        }
        else if(el === '~' && !['v','y'].includes(alignment[0][i])) {
                const slice0 = alignment[0].slice(i-10,i+10).join('');
                const slice1 = alignment[1].slice(i-10,i).join('') +
                    `<mark>${el}</mark>` + 
                    alignment[1].slice(i+1,i+10).join('');
                ret.push(`Unmatched sandhi: <span class="choice"><span>${slice0}</span><span>${slice1}</span></span>`);
        }
        else if(el === '+' && alignment[0][i] === '') {
                const slice = alignment[1].slice(i-10,i).join('') +
                    `<mark>${el}</mark>` + 
                    alignment[1].slice(i+1,i+10).join('');
                ret.push(`Unmatched sandhi: ${slice}`);
        }
    });
    return ret;
};

const removeOptions = (words) => words.map(w => w.split('/')[0]);

const tamilSplit = (str) => {
    const ret = [];
    const ugh = new Set(['i','u']);
    for(let n=0;n<str.length;n++) {
        if(ugh.has(str[n]) && ret[ret.length-1] === 'a')
                ret[ret.length-1] = 'a' + str[n];
        else
            ret.push(str[n]);
    }
    return ret;
};

const alignWordsplits = (text,tam,eng) => {
    if(tam.length !== eng.length) {
        return {xml: null, warnings: ['Tamil and English don\'t match.']};
    }
    //const wl = restoreSandhi(removeOptions(tam).join(''));
    const wl = tamilSplit(removeOptions(tam).join(''));
    const aligned = needlemanWunsch(tamilSplit(text),wl,wordsplitscore);
    ///const warnings = warnTypos(aligned);
    const warnings = [];
    const realigned = jiggleAlignment(aligned,tam);
    
    const wordlist = tam.map((e,i) => {
        // TODO: should we remove hyphens or not?
        //return {word: e, translation: cleanupTranslation(eng[i])};
        return {word: e, translation: eng[i]};
    });
    
    cleanupWordlist(wordlist);

    const entries = makeEntries(wordlist);
    //console.log(aligned1.map(a => a.map(b => typeof b === 'symbol'? b.toString() : b).join(',')).join('\n'));
    const rle = formatAlignment(realigned,0);
    return {xml: rle + '\n' + entries.join('\n'), alignment: aligned};
};

const cleanupTranslation = (str) => {
    return str.replace(/-(?=\w)/g, ' ');
};

const restoreSandhi = (s) => {
    return s/*.replace(/[mṉ]$/,'x')*/ // need to share
            .replaceAll(/([iīeē])~/g,'$1y')
            .replaceAll(/([aāuūoō])~/g,'$1v')
            .replaceAll(/[\[\]]/g,'');
};

const formatAlignment = (arr) => {
    const getChar = s => {
            if(s === '') return 'G';
            else if(s === CONCATRIGHT) return 'R';
            else if(s === CONCATLEFT) return 'L';
            else return 'M';
    };
    let a0 = '';
    let a1 = '';
    for(let n=0;n<arr[0].length;n++) {
        const arr0len = arr[0][n].length;
        const arr1len = arr[1][n].length;
        if(arr0len === 2) {
            a0 = a0 + 'MM';
            if(arr1len === 2)
                a1 = a1 + 'MM';
            else
                a1 = getChar(arr[1][n]) + 'G';
        }
        else if(arr1len === 2) {
            a1 = a1 + 'MM';
            a0 = getChar(arr[0][n]) + 'G';
        }
        else {
            a0 = a0 + getChar(arr[0][n]);
            a1 = a1 + getChar(arr[1][n]);
        }
    }
    /*
    const flatarrs = arr.map(a => {
        const alignment = a.map(s => {
            if(s === '') return 'G';
            else if(s === CONCATRIGHT) return 'R';
            else if(s === CONCATLEFT) return 'L';
            else return 'M';
        }).join('');
        return alignment.replaceAll(/([GRLM])\1+/g,(match, chr) => match.length + chr);
    });
    */
    const flatarrs = [a0,a1].map(a => a.replaceAll(/([GRLM])\1+/g,(match, chr) => match.length + chr));
    return `<interp type="alignment" select="0">${flatarrs[0]},${flatarrs[1]}</interp>`;
};

const makeEntries = (arr) => {
    const formatWord = (w) => {
        return w.replace(/([~+()])/g,'<pc>$1</pc>')
                //.replace(/['’*]$/,'<pc type="ignored">(</pc>u<pc type="ignored">)</pc>')
                .replace(/['’*]/,'<pc type="ignored">(</pc>u<pc type="ignored">)</pc>')
                .replaceAll(/\[(.+?)\]/g,'<supplied>$1</supplied>');
                //.replaceAll(/\[(.+?)\]/g,'$1');
    };

    const formatEntry = (e) => {
        const bare = e.bare ? `<form type="simple">${e.bare}</form>\n` : '';
        const affixrole = e.affixrole ? `<gram type="role">${e.affixrole}</gram>` : '';
        const affix = e.affix ? `<gramGrp type="affix"><form>${e.affix}</form>${affixrole}</gramGrp>\n` : '';
        const gram = e.gram ? `<gram type="role">${e.gram}</gram>\n` : '';
        const particle = e.particle ? `<gramGrp type="particle"><form>${e.particle}</form></gramGrp>\n` : '';
        return `<entry>\n<form>${formatWord(e.word)}</form>\n<def>${e.translation}</def>\n${bare}${affix}${gram}${particle}${e.wordnote ? formatNote(e.wordnote) : ''}${e.transnote ? formatNote(e.transnote) : ''}</entry>`;
    };

    return arr.map(obj => {
        const wordsplit = obj.word.split('/');
        if(wordsplit.length > 1) {
            const transsplit = obj.translation.split('/');
            const newobj = [];
            for(let n=0;n<wordsplit.length;n++)
                newobj.push({word: wordsplit[n], translation: transsplit[n]});
            const formatted = newobj.map(f => `<entry>\n${formatEntry(f)}\n</entry>`).join('');
            return `<superEntry type="ambiguous">\n${formatted}\n</superEntry>`;
        }
        else
            return formatEntry(obj);
    });
};

const cleanBare = (str) => {
    //str = str.replaceAll(/[~+-.]/g,'').replace(/['’*]$/,'u');
    str = str.replaceAll(/[~+.]/g,'').replace(/-$/,'').replace(/['’*]/,'u');
    /*
    if(str.match(/[iīeē]y$/))
        return str.slice(0,-1); // inserted glide
    if(str.match(/[aāuūoō]v$/))
        return str.slice(0,-1); // inserted glide; but what if it's vu?
    if(str.match(/[kcṭtpvṟ]$|ṉṉ$/))
        return str + 'u'; // probably elided overshort u
    if(str.match(/mm$/))
        return str.slice(0,-1); // probably geminated m (uyiram + ē -> uyirammē)
    */
    return str;
};

const findParticle = (word,translation) => {
    for(const [affix,regex] of affixes) {
        const cleanword = word.replaceAll(/[\[\]]/g,'');
        const wordmatch = cleanword.match(regex);
        const transmatch = translation.match(regex);
        if(wordmatch && transmatch)
            return {
                //translation: translation.slice(0,translation.length-transmatch[0].length),
                translation: translation.replace(regex,''),
                particle: affix,
                //bare: cleanBare(cleanword.slice(0,cleanword.length-wordmatch[0].length))
                bare: cleanBare(cleanword.replace(regex,''))
            };
    }
    for(const [affix,obj] of caseAffixes) {
        const wordmatch = word.match(obj.regex);
        const transmatch = translation.match(obj.translationregex);
        if(wordmatch && transmatch) {
            const ret = {
                translation: translation.slice(0,translation.length-transmatch[0].length),
                affix: affix,
                // don't clip affix for case particles; the declined form goes into the dictionary
            };
            if(obj.gram) ret.gram = obj.gram;
            return ret;
        }
    }
    return null;
};

const findGrammar = (translation) => {
    for(const [affix,gram] of gramAbbreviations) {
       if(translation.endsWith(affix))
            return {
                translation: translation.slice(0,translation.length-affix.length),
                gram:  gram
            };
       else if(translation.endsWith(affix + '-'))
            return {
                translation: translation.slice(0,translation.length-affix.length-1) + '-',
                gram:  gram
            };
    }
    return null;
};

const cleanupWordlist = (list) => {
    const cleanupWord = (obj) => {
        // we should remove punctuation from the wordlist so it aligns properly
        //obj.word = obj.word.replace(/[\.;]$/,'');
        //obj.translation = obj.translation.replace(/[\.;]$/,'');
        const particle = findParticle(obj.word,obj.translation);
        if(particle) {
            console.log(`Found particle: ${particle.affix || particle.particle} in ${obj.word}, "${obj.translation}".`);
            obj.translation = particle.translation;
            if(particle.affix) obj.affix = particle.affix;
            if(particle.particle) obj.particle = particle.particle;
            if(particle.gram) obj.affixrole = particle.gram;
            if(particle.bare) obj.bare = particle.bare;
        }
        const grammar = findGrammar(obj.translation);
        if(grammar) {
            //console.log(`Found grammar: ${grammar.gram} in ${obj.translation}`);
            obj.translation = grammar.translation;
            if(obj.gram) obj.gram = [obj.gram,grammar.gram];
            else obj.gram = grammar.gram;
        }
        if(!particle && !grammar) {
            const maybeParticle = obj.translation.match(/\(.+\)-?/);
            if(maybeParticle) console.log(`What about ${maybeParticle[0]} in "${obj.translation}"?`);
        }
        
    };
    for(const entry of list)
        cleanupWord(entry);
};

/*
const mergeWordlists = (doc, list1, list2) => {
    const newlist1 = markSegs(doc,list1,0);
    const newlist2 = markSegs(doc,list2,1);
    const merged = [...newlist1];
    
    for(const item of newlist2)
        if(item.hasOwnProperty('strand'))
            merged.push(item);
    
    merged.sort((a,b) => a.start - b.start);
    return merged;
};
*/
const realNextSibling = (walker) => {
    let cur = walker.currentNode;
    while(cur) {
        const sib = walker.nextSibling();
        if(sib) return sib;
        cur = walker.parentNode();
    }
    return null;
};

const extracttext = (el, i) => {
    const clone = el.documentElement.cloneNode(true);
    const toremove = [];
    const choices = clone.querySelectorAll('choice');
    for(const choice of choices) {
        const segs = choice.querySelectorAll('seg');
        for(let n=0; n<segs.length; n++) {
            if(n !== i) toremove.push(segs[n]);
        }
    }
    for(const el of toremove) el.remove();
    return clone.textContent.replaceAll(/\s/g,'');
};

const jiggleWord = (word, text, start, end) => {
    const wordend = word.at(-1);
    const wordstart = word.at(0);
    const textend = text[end-1];
    const textpostend = text[end];
    const textstart = text[start-1];
    const textprestart = text[start-2];
    if(textend === '') { // assimilated final

        if(wordend === 'm' && ['m','n'].includes(textpostend))
            //end = end + 1;
            text[end-1] = CONCATRIGHT;

        else if(wordend === 'l' && ['ṟ','ṉ'].includes(textpostend))
            //end = end + 1;
            text[end-1] = CONCATRIGHT;

        else if(wordend === 'ḷ' && ['ṭ','ṇ'].includes(textpostend))
            //end = end + 1;
            text[end-1] = CONCATRIGHT;
    }

    if(textstart === '') { // assimilated initial
        if(wordstart === 'n' && ['ṉ','ṇ'].includes(textprestart))
            //start = start - 1;
            text[start-1] = CONCATLEFT;

        else if(wordstart === 't' && ['ṭ','ṟ'].includes(textprestart))
            //start = start - 1;
            text[start-1] = CONCATLEFT;

        else if(wordstart === 'm' && textprestart === 'm')
            //start = start - 1;
            text[start-1] = CONCATLEFT;
    }
    //return [start,end];
    return text;
};

const jiggleAlignment = (aligned, wordlist) => {
    aligned = [...aligned];
    wordlist = [...wordlist];
    const words = [];
    let wordstart = 0;
    let curword = wordlist.shift().replaceAll(/[\[\]]/g,''); // AGGHHH
    let curcount = 0;
    for(let n=0; n<aligned[1].length; n++) {
        if(curcount === tamilSplit(curword).length) {
            aligned[0] = jiggleWord(tamilSplit(curword), aligned[0], wordstart, n);
            wordstart = n+1;
            curcount = 0;
            curword = wordlist.shift()?.replaceAll(/[\[\]]/g,''); // UGGHHHH
        }
        if(aligned[1][n] !== '')
            curcount = curcount + 1;
    }
    return aligned;
};

export { alignWordsplits, tamilSplit };