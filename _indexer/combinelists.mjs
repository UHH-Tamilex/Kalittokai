import Fs from 'fs';
import Jsdom from 'jsdom';

const template = Fs.readFileSync('wordlist-template.xml',{encoding: 'UTF-8'});

const go = () => {
    Fs.readdir('wordlists',(err, files) => {
        if(err) return console.log(err);
        const flist = [];
        files.forEach(f => {
            if(/\.xml$/.test(f))
                flist.push('wordlists/'+f);
        });
        flist.sort((a,b) =>
            parseInt(a.replaceAll(/\D/g,'')) - parseInt(b.replaceAll(/\D/g,''))
        );

        readfiles(flist);
    });
};

const readfiles = (arr) => {
     
    const words = new Map();
    const wits = [];

    for(const fname of arr)
        addWords(words,wits,fname);
    
    const wordgroups = new Map(
        [...order].reverse().map(s => [s,[]])
    );
    for(const [word, entry] of words) {
        const arr = wordgroups.get(word[0]);
        arr.push([word,entry]);
    }

    let out = template
        .replace('<!--witnesses-->',wits.join(''))
        .replace(/<\/TEI>/,'') + '<text xml:lang="ta"><body>';

    for(const [heading, entries] of [...wordgroups]) {
        if(entries.length === 0) continue;
        entries.sort(tamilSort2);
        const formatted = formatWords(entries);
        out = out + `<div><head>${heading}</head>${formatted}</div>`;
    }
    out = out + '</body>\n</text>\n</TEI>';

    Fs.writeFileSync('../wordindex.xml',out);
};

const order = 'aāiīuūṛṝeēoōkgṅcjñṭḍṇtdnpbmyrlvḻḷṟṉśṣsh'.split('').reverse();
const ordermap = new Map();
for(const [i,v] of order.entries()) {
    ordermap.set(v,i);
}

const tamilSort2 = (a,b) => tamilSort(a[0],b[0]);

const tamilSort = (a,b) => {
    const minlen = Math.min(a.length,b.length);
    let n = 0;
    while(n < minlen) {
        const achar = a.charAt(n);
        const bchar = b.charAt(n);
        if(achar === bchar) {
            n++;
        } else {
            
            const aindex = ordermap.get(achar) || -1;
            const bindex = ordermap.get(bchar) || -1;
            return aindex < bindex ? 1 : -1;
            
            //return order.indexOf(achar) < order.indexOf(bchar);
        }
    }
    return a.length > b.length ? 1 : -1;
};

const formatWords = (words) => {
    let ret = '';
    for(const [word, entry] of words) {
           ret += '<entry>\n';
           ret += `<form type="standard">${word}</form>\n`;
           const sandhis = [...entry.sandhis];
           sandhis.sort(tamilSort2);
           for(const sandhi of sandhis)
               ret += `<form type="sandhi">${sandhi}</form>`;
           const particles = [...entry.particles];
           particles.sort(tamilSort2);
           for(const particle of particles)
               ret += `<gram type="particle">${particle}</gram>`;
           for(const def of entry.defs)
               ret += `<def xml:lang="en">${def}</def>`;
           for(const cit of entry.cits)
               ret += cit.outerHTML;
           for(const app of entry.apps)
               ret += gapsEtc(app.outerHTML);
           ret += '</entry>\n';
    }
    return ret;
};
const gapsEtc = (str) => {
    return str.replace(/‡+/g, match => 
        `<gap reason="lost" unit="character" quantity="${match.length}"/>`);
};

const addWords = (words, wits, fname) => {
    const str = Fs.readFileSync(fname,{encoding: 'utf-8'});
    const dom = new Jsdom.JSDOM('');
    const parser = new dom.window.DOMParser();
    const doc = parser.parseFromString(str,'text/xml');
    wits.push(doc.querySelector('witness').outerHTML);

    const entries = doc.querySelectorAll('entry');
    for(const entry of entries) {
        const word = entry.querySelector('form[type="standard"]').textContent;
        const sandhi = entry.querySelector('form[type="sandhi"]');
        const particle = entry.querySelector('gramGrp[type="particle"] form, gramGrp[type="particle"] m');
        const def = entry.querySelector('def');
        const app = entry.querySelector('app');
        const cit = entry.querySelector('cit');
        const curentry = words.get(word);
        if(!curentry) {
            const ret = {};
            ret.sandhis = sandhi ? new Set([sandhi.textContent]) : new Set();
            ret.particles = particle ? new Set([particle.textContent]) : new Set();
            ret.defs = def ? new Set([def.textContent]) : new Set();
            ret.apps = app ? [app.cloneNode(true)] : [] ;
            ret.cits = cit ? [cit.cloneNode(true)] : [] ;
            words.set(word, ret);
        }
        else {
            if(sandhi) curentry.sandhis.add(sandhi.textContent);
            if(particle) curentry.particles.add(particle.textContent);
            if(def) curentry.defs.add(def.textContent);
            if(app) curentry.apps.push(app.cloneNode(true));
            if(cit) curentry.cits.push(cit.cloneNode(true));
        }
    }
};

go();
