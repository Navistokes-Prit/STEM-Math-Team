(() => {
"use strict";

const lessonKey = document.body.dataset.lesson;
const lessonId = document.body.dataset.lessonId;
const STORAGE_KEY = `math9-unit5-${lessonId}-progress-v1`;
const $ = id => document.getElementById(id);

const els = {
    tabs: document.querySelectorAll(".tab"),
    panels: document.querySelectorAll(".tab-panel"),
    start: $("startPracticeButton"),
    skill: $("questionSkill"),
    number: $("questionNumber"),
    instruction: $("questionInstruction"),
    problem: $("problemText"),
    pill: $("difficultyPill"),
    label: $("difficultyLabel"),
    input: $("answerInput"),
    preview: $("answerPreview"),
    check: $("checkAnswerButton"),
    feedback: $("feedback"),
    hint: $("hintButton"),
    solution: $("solutionButton"),
    next: $("newQuestionButton"),
    hintBox: $("hintBox"),
    solutionBox: $("solutionBox"),
    attempted: $("attemptedStat"),
    correct: $("correctStat"),
    streak: $("streakStat"),
    accuracy: $("accuracyPercent"),
    ring: $("progressRing"),
    masteryBar: $("masteryBar"),
    masteryText: $("masteryText"),
    reset: $("resetProgressButton"),
    quizButton: $("quizLockButton")
};

const state = {
    qnum: 0,
    question: null,
    counted: false,
    progress: loadProgress()
};

function loadProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return {
            attempted: Number(saved?.attempted) || 0,
            correct: Number(saved?.correct) || 0,
            streak: Number(saved?.streak) || 0
        };
    } catch {
        return { attempted: 0, correct: 0, streak: 0 };
    }
}
function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
function ri(a,b) { return Math.floor(Math.random()*(b-a+1))+a; }
function pick(arr) { return arr[ri(0,arr.length-1)]; }
function nonZeroInt(a,b) { let x=0; while(x===0) x=ri(a,b); return x; }
function gcd(a,b) { a=Math.abs(a); b=Math.abs(b); while(b){ const t=b; b=a%b; a=t; } return a||1; }

function difficulty() {
    const p=state.progress;
    const acc=p.attempted ? p.correct/p.attempted : 0;
    if(p.attempted>=7 && p.streak>=3 && acc>=0.8) return 3;
    if(p.attempted>=3 && acc>=0.6) return 2;
    return 1;
}
const difficultyNames={1:"Foundation",2:"Standard",3:"Challenge"};

function fmt(n) {
    if (Math.abs(n-Math.round(n))<1e-10) return String(Math.round(n));
    return String(Number(n.toFixed(4)));
}
function frac(n,d) {
    if(d===0) return "undefined";
    if(d<0){ n=-n; d=-d; }
    const g=gcd(n,d); n/=g; d/=g;
    if(d===1) return String(n);
    return `${n}/${d}`;
}
function latexFrac(n,d) {
    if(d<0){n=-n;d=-d;}
    const g=gcd(n,d); n/=g; d/=g;
    if(d===1) return String(n);
    if(n<0) return `-\\frac{${Math.abs(n)}}{${d}}`;
    return `\\frac{${n}}{${d}}`;
}
function signedTerm(n, variable="") {
    if(n===0) return "";
    const sign=n>0?"+":"-";
    const a=Math.abs(n);
    if(variable) return ` ${sign} ${a===1?"":a}${variable}`;
    return ` ${sign} ${a}`;
}
function lineLatex(m,b) {
    let mpart="";
    if(m===1) mpart="x";
    else if(m===-1) mpart="-x";
    else mpart=`${fmt(m)}x`;
    return `y=${mpart}${b===0?"":signedTerm(b)}`;
}
function lineText(m,b) {
    let mpart="";
    if(m===1) mpart="x";
    else if(m===-1) mpart="-x";
    else if(Number.isInteger(m)) mpart=`${m}x`;
    else mpart=`${frac(Math.round(m*1000),1000)}x`;
    return `y=${mpart}${b===0?"":signedTerm(b)}`.replace(/\s+/g,"");
}
function tableHTML(xs, ys, headers=["x","y"]) {
    const xcells=xs.map(v=>`<td>${v}</td>`).join("");
    const ycells=ys.map(v=>`<td>${v}</td>`).join("");
    return `<table class="table-values"><tr><th>${headers[0]}</th>${xcells}</tr><tr><th>${headers[1]}</th>${ycells}</tr></table>`;
}

function graphSVG({m=null,b=0,line2=null,points=[],xmin=-5,xmax=5,ymin=-5,ymax=5,label=""}={}) {
    const width=560, height=350, pad=38;
    const X=x=>pad+(x-xmin)*(width-2*pad)/(xmax-xmin);
    const Y=y=>height-pad-(y-ymin)*(height-2*pad)/(ymax-ymin);
    let s=[];
    for(let x=Math.ceil(xmin);x<=Math.floor(xmax);x++) {
        s.push(`<line x1="${X(x)}" y1="${Y(ymin)}" x2="${X(x)}" y2="${Y(ymax)}" class="gridline"/>`);
    }
    for(let y=Math.ceil(ymin);y<=Math.floor(ymax);y++) {
        s.push(`<line x1="${X(xmin)}" y1="${Y(y)}" x2="${X(xmax)}" y2="${Y(y)}" class="gridline"/>`);
    }
    if(xmin<=0 && xmax>=0) s.push(`<line x1="${X(0)}" y1="${Y(ymin)}" x2="${X(0)}" y2="${Y(ymax)}" class="axis"/>`);
    if(ymin<=0 && ymax>=0) s.push(`<line x1="${X(xmin)}" y1="${Y(0)}" x2="${X(xmax)}" y2="${Y(0)}" class="axis"/>`);
    for(let x=Math.ceil(xmin);x<=Math.floor(xmax);x++) if(x!==0) s.push(`<text x="${X(x)}" y="${Y(0)+16}" class="tick">${x}</text>`);
    for(let y=Math.ceil(ymin);y<=Math.floor(ymax);y++) if(y!==0) s.push(`<text x="${X(0)-10}" y="${Y(y)+4}" class="tick" text-anchor="end">${y}</text>`);
    function addLine(mm,bb,cls){
        let pts=[];
        [[xmin,mm*xmin+bb],[xmax,mm*xmax+bb]].forEach(p=>{ if(p[1]>=ymin && p[1]<=ymax) pts.push(p); });
        if(Math.abs(mm)>1e-12){
            [[(ymin-bb)/mm,ymin],[(ymax-bb)/mm,ymax]].forEach(p=>{ if(p[0]>=xmin && p[0]<=xmax) pts.push(p); });
        }
        const u=[];
        pts.forEach(p=>{ if(!u.some(q=>Math.abs(q[0]-p[0])<1e-8 && Math.abs(q[1]-p[1])<1e-8)) u.push(p); });
        if(u.length>=2) s.push(`<line x1="${X(u[0][0])}" y1="${Y(u[0][1])}" x2="${X(u[1][0])}" y2="${Y(u[1][1])}" class="${cls}"/>`);
    }
    if(m!==null) addLine(m,b,"plotline");
    if(line2) addLine(line2[0],line2[1],"plotline secondary");
    points.forEach(p=>{
        const [x,y,name=""]=p;
        s.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="6" class="point"/>`);
        if(name) s.push(`<text x="${X(x)+9}" y="${Y(y)-9}" class="point-label">${name}</text>`);
    });
    if(label) s.push(`<text x="${width-190}" y="24" class="line-label">${label}</text>`);
    s.push(`<text x="${width-17}" y="${Y(0)-8}" class="axis-label">x</text>`);
    s.push(`<text x="${X(0)+8}" y="18" class="axis-label">y</text>`);
    return `<div class="diagram-card"><svg class="practice-visual" viewBox="0 0 ${width} ${height}" role="img" aria-label="Coordinate graph">${s.join("")}</svg></div>`;
}

function numberLineSVG(value,op,xmin=-6,xmax=6) {
    const width=600,height=120,pad=44;
    const X=x=>pad+(x-xmin)*(width-2*pad)/(xmax-xmin);
    let s=[`<line x1="${X(xmin)}" y1="60" x2="${X(xmax)}" y2="60" class="axis"/>`];
    for(let x=xmin;x<=xmax;x++){
        s.push(`<line x1="${X(x)}" y1="52" x2="${X(x)}" y2="68" class="axis"/>`);
        s.push(`<text x="${X(x)}" y="91" class="tick">${x}</text>`);
    }
    const right=op===">"||op===">=", closed=op===">="||op==="<=";
    const end=X(right?xmax:xmin), start=X(value);
    s.push(`<line x1="${start}" y1="60" x2="${end}" y2="60" class="solution-ray"/>`);
    s.push(`<circle cx="${start}" cy="60" r="8" class="${closed?"closed-dot":"open-dot"}"/>`);
    if(right) s.push(`<path d="M ${end-14} 52 L ${end} 60 L ${end-14} 68" class="arrow"/>`);
    else s.push(`<path d="M ${end+14} 52 L ${end} 60 L ${end+14} 68" class="arrow"/>`);
    return `<div class="diagram-card"><svg class="practice-visual" viewBox="0 0 ${width} ${height}" role="img" aria-label="Number line">${s.join("")}</svg></div>`;
}

/* ---------- Answer parsing ---------- */
function stripLatex(s) {
    return String(s??"")
        .replace(/−/g,"-").replace(/≤/g,"<=").replace(/≥/g,">=")
        .replace(/\\leq?|\\le/g,"<=").replace(/\\geq?|\\ge/g,">=")
        .replace(/\\left|\\right/g,"").replace(/\\,/g,"")
        .replace(/\$/g,"").replace(/\\\(|\\\)|\\\[|\\\]/g,"")
        .trim();
}
function convertFractions(s) {
    let t=s, guard=0;
    const re=/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/;
    while(re.test(t) && guard++<20) t=t.replace(re,"($1)/($2)");
    return t;
}
function parseNumber(s) {
    let t=convertFractions(stripLatex(s)).replace(/\s+/g,"").replace(/[{}]/g,"");
    if(/^[-+]?\d*\.?\d+$/.test(t)) return Number(t);
    let m=t.match(/^\(?([-+]?\d*\.?\d+)\)?\/\(?([-+]?\d*\.?\d+)\)?$/);
    if(m && Number(m[2])!==0) return Number(m[1])/Number(m[2]);
    return NaN;
}
function parsePoint(s) {
    let t=stripLatex(s).replace(/\s+/g,"").replace(/[()[\]{}]/g,"");
    const parts=t.split(",");
    if(parts.length!==2) return null;
    const x=parseNumber(parts[0]), y=parseNumber(parts[1]);
    return Number.isFinite(x)&&Number.isFinite(y)?[x,y]:null;
}
function normalizeText(s) {
    return stripLatex(s).toLowerCase().replace(/\s+/g," ").trim()
        .replace(/^quadrant\s+/,"");
}
function parseList(s) {
    return stripLatex(s).split(/[,;]+/).map(x=>parseNumber(x.trim())).filter(Number.isFinite);
}
function parseCoeff(c) {
    c=c.replace(/^\((.*)\)$/,"$1");
    if(c===""||c==="+") return 1;
    if(c==="-") return -1;
    return parseNumber(c);
}
function parseLineEquation(s) {
    let t=convertFractions(stripLatex(s)).toLowerCase().replace(/\s+/g,"").replace(/\*/g,"");
    t=t.replace(/\^\{?1\}?/g,"");
    let m=t.match(/^([xy])=(.+)$/);
    if(!m) return null;
    const left=m[1], rhs=m[2];
    if(left==="x"){
        const v=parseNumber(rhs);
        return Number.isFinite(v)?{kind:"vertical",value:v}:null;
    }
    if(!rhs.includes("x")){
        const v=parseNumber(rhs);
        return Number.isFinite(v)?{kind:"linear",m:0,b:v}:null;
    }
    const pos=rhs.indexOf("x");
    let cs=rhs.slice(0,pos), rest=rhs.slice(pos+1);
    const slope=parseCoeff(cs);
    if(!Number.isFinite(slope)) return null;
    let intercept=0;
    if(rest){
        intercept=parseNumber(rest);
        if(!Number.isFinite(intercept)) return null;
    }
    return {kind:"linear",m:slope,b:intercept};
}
function invertOp(op){ return {"<":">",">":"<","<=":">=",">=":"<="}[op]; }
function parseInequality(s) {
    let t=convertFractions(stripLatex(s)).toLowerCase().replace(/\s+/g,"");
    let m=t.match(/^x(<=|>=|<|>)(.+)$/);
    if(m){
        const v=parseNumber(m[2]); if(!Number.isFinite(v)) return null;
        return {variable:"x",op:m[1],value:v};
    }
    m=t.match(/^(.+)(<=|>=|<|>)x$/);
    if(m){
        const v=parseNumber(m[1]); if(!Number.isFinite(v)) return null;
        return {variable:"x",op:invertOp(m[2]),value:v};
    }
    return null;
}
function nearly(a,b){ return Math.abs(a-b)<1e-7; }

function checkAnswer(q, raw) {
    if(!raw.trim()) return false;
    switch(q.type){
        case "number": {
            const v=parseNumber(raw); return Number.isFinite(v) && nearly(v,q.answer);
        }
        case "point": {
            const p=parsePoint(raw); return p && nearly(p[0],q.answer[0]) && nearly(p[1],q.answer[1]);
        }
        case "list": {
            const a=parseList(raw);
            return a.length===q.answer.length && a.every((v,i)=>nearly(v,q.answer[i]));
        }
        case "text": {
            const v=normalizeText(raw);
            return q.answer.map(normalizeText).includes(v);
        }
        case "line": {
            const got=parseLineEquation(raw), exp=q.answer;
            if(!got) return false;
            if(exp.kind==="vertical") return got.kind==="vertical" && nearly(got.value,exp.value);
            return got.kind==="linear" && nearly(got.m,exp.m) && nearly(got.b,exp.b);
        }
        case "inequality": {
            const got=parseInequality(raw), exp=q.answer;
            return got && got.op===exp.op && nearly(got.value,exp.value);
        }
        default: return normalizeText(raw)===normalizeText(String(q.answer));
    }
}

/* ---------- Question factories ---------- */
function q501(d){
    if(d===1 && Math.random()<.5){
        const x=ri(-4,4), y=ri(-4,4);
        return {
            skill:"Coordinates", instruction:"Read the plotted point.",
            prompt:`<div class="small-prompt"><strong>What are the coordinates of point P?</strong>${graphSVG({m:null,points:[[x,y,"P"]]})}</div>`,
            type:"point", answer:[x,y],
            hint:"Read x first (left/right), then y (up/down).",
            solution:`<ol><li>Trace point P vertically to the x-axis: \(x=${x}\).</li><li>Trace horizontally to the y-axis: \(y=${y}\).</li><li>The ordered pair is <strong>(${x}, ${y})</strong>.</li></ol>`
        };
    }
    if(d<=2 && Math.random()<.55){
        const horizontal=Math.random()<.5, c=nonZeroInt(-5,5);
        const pts=horizontal?[[-4,c,""],[0,c,""],[4,c,""]]:[[c,-4,""],[c,0,""],[c,4,""]];
        let visual;
        if(horizontal) visual=graphSVG({m:0,b:c,points:pts,label:`y = ${c}`});
        else {
            // emulate vertical line with SVG overlay by using points only and textual prompt
            visual=graphSVG({m:null,points:pts,label:`vertical through x = ${c}`});
        }
        return {
            skill:"Horizontal & Vertical Lines", instruction:"Write the equation of the line.",
            prompt:`<div class="small-prompt">${visual}<p>The highlighted points lie on the same ${horizontal?"horizontal":"vertical"} line.</p></div>`,
            type:"line", answer: horizontal?{kind:"linear",m:0,b:c}:{kind:"vertical",value:c},
            hint:horizontal?"A horizontal line keeps y constant.":"A vertical line keeps x constant.",
            solution:`<ol><li>All shown points have the same ${horizontal?"y":"x"}-coordinate: ${c}.</li><li>A ${horizontal?"horizontal":"vertical"} line is written ${horizontal?"y = constant":"x = constant"}.</li><li>Equation: <strong>${horizontal?"y":"x"} = ${c}</strong>.</li></ol>`
        };
    }
    const first=ri(-10,20), diff=d===1?ri(2,6):nonZeroInt(-7,7);
    const terms=Array.from({length:5},(_,i)=>first+i*diff);
    const next=[first+5*diff,first+6*diff,first+7*diff];
    return {
        skill:"Sequences", instruction:"Continue the linear sequence.",
        prompt:`<div class="small-prompt"><div class="math-line">\( ${terms.join(",\\ ")} ,\\ldots\)</div><p>Enter the next three terms separated by commas.</p></div>`,
        type:"list", answer:next,
        hint:`Find the common difference by subtracting consecutive terms.`,
        solution:`<ol><li>${terms[1]} − ${terms[0]} = ${diff}, so the common difference is ${diff}.</li><li>Apply the same change three more times.</li><li>Next terms: <strong>${next.join(", ")}</strong>.</li></ol>`
    };
}

function q502(d){
    let m=d===1?pick([1,2,3,4]):nonZeroInt(-5,5);
    let b=ri(-5,6), x=d===1?ri(0,5):ri(-5,5);
    const y=m*x+b;
    const xs=[x-1,x,x+1], ys=xs.map(v=>m*v+b);
    return {
        skill:"Table of Values", instruction:"Use substitution to find the missing output.",
        prompt:`<div class="small-prompt"><div class="math-line">\( ${lineLatex(m,b)} \)</div>${tableHTML(xs,[ys[0],"?",ys[2]])}<p>Find the missing y-value when x = ${x}.</p></div>`,
        type:"number", answer:y,
        hint:`Substitute x = ${x} into the rule. ${x<0?"Use brackets around the negative input.":""}`,
        solution:`<ol><li>Start with \( ${lineLatex(m,b)} \).</li><li>Substitute \(x=${x}\): \(y=${m}(${x})${b===0?"":signedTerm(b)}\).</li><li>Calculate: \(y=${y}\).</li></ol>`
    };
}

function q503(d){
    const m=d===1?pick([1,2,-1]):pick([-2,-1,1,2]), b=ri(-2,2);
    const x=ri(-2,2), y=m*x+b;
    return {
        skill:"Plotting from a Table", instruction:"Read the point that belongs on the graph.",
        prompt:`<div class="small-prompt"><p>The table comes from \( ${lineLatex(m,b)} \).</p>${tableHTML([x-1,x,x+1],[m*(x-1)+b,y,m*(x+1)+b])}${graphSVG({m, b, points:[[x,y,"P"]],xmin:-5,xmax:5,ymin:-6,ymax:6})}<p>What are the coordinates of point P?</p></div>`,
        type:"point", answer:[x,y],
        hint:"Each column of the table gives an ordered pair (x, y). Match x and y from the same column.",
        solution:`<ol><li>Find the column containing x = ${x}.</li><li>The matching output is y = ${y}.</li><li>Point P is <strong>(${x}, ${y})</strong>.</li></ol>`
    };
}

function q504(d){
    const m=d===1?pick([1,2,-1,-2]):pick([-2,-1,1,2]), b=ri(-2,2);
    const askSlope=Math.random()<.6;
    const x1=0,y1=b,x2=2,y2=m*2+b;
    return {
        skill:"Slope & y-intercept", instruction:askSlope?"Find the slope.":"Find the y-intercept.",
        prompt:`<div class="small-prompt">${graphSVG({m,b,points:[[x1,y1,"A"],[x2,y2,"B"]],xmin:-5,xmax:5,ymin:-7,ymax:7})}<p>${askSlope?"Use the labelled points A and B.":"Give the y-value where the line crosses the y-axis."}</p></div>`,
        type:"number", answer:askSlope?m:b,
        hint:askSlope?"Use rise/run = (y₂ − y₁)/(x₂ − x₁).":"At the y-axis, x = 0.",
        solution:askSlope
          ? `<ol><li>Use A = (0, ${b}) and B = (2, ${y2}).</li><li>Rise = ${y2} − ${b} = ${y2-b}; run = 2 − 0 = 2.</li><li>\(m=\\frac{${y2-b}}{2}=${m}\).</li></ol>`
          : `<ol><li>The y-intercept occurs where x = 0.</li><li>The line crosses at (0, ${b}).</li><li>Therefore the y-intercept is <strong>${b}</strong>.</li></ol>`
    };
}

function q505(d){
    const m=d===1?pick([1,2,-1,-2]):pick([-2,-1,1,2]), b=ri(-3,3);
    return {
        skill:"Equation of a Line", instruction:"Write the equation in y = mx + b form.",
        prompt:`<div class="small-prompt">${graphSVG({m,b,points:[[0,b,""],[1,m+b,""]],xmin:-5,xmax:5,ymin:-7,ymax:7})}<p>Find the slope and y-intercept, then write the equation.</p></div>`,
        type:"line", answer:{kind:"linear",m,b},
        hint:"First read b at x = 0. Then calculate rise/run between two clear points.",
        solution:`<ol><li>The line crosses the y-axis at ${b}, so \(b=${b}\).</li><li>From (0, ${b}) to (1, ${m+b}), rise = ${m} and run = 1, so \(m=${m}\).</li><li>Equation: <strong>\( ${lineLatex(m,b)} \)</strong>.</li></ol>`
    };
}

function q506(d){
    const m=d===1?pick([1,2,-1,-2]):nonZeroInt(-4,4), b=ri(-5,5);
    if(d===1 || Math.random()<.45){
        return {
            skill:"Parallel Lines", instruction:"Find the slope of a parallel line.",
            prompt:`<div class="small-prompt"><div class="math-line">\( ${lineLatex(m,b)} \)</div><p>What slope must any non-vertical line parallel to this line have?</p></div>`,
            type:"number", answer:m,
            hint:"Parallel lines have the same slope.",
            solution:`<ol><li>In y = mx + b, the slope is the coefficient of x.</li><li>Here m = ${m}.</li><li>A parallel line must also have slope <strong>${m}</strong>.</li></ol>`
        };
    }
    const x0=ri(-3,3), y0=ri(-4,4);
    const b2=y0-m*x0;
    return {
        skill:"Parallel Lines", instruction:"Write the equation of the parallel line.",
        prompt:`<div class="small-prompt"><p>Write the equation of the line parallel to \( ${lineLatex(m,b)} \) that passes through \(( ${x0}, ${y0} )\).</p>${graphSVG({m,b,line2:[m,b2],points:[[x0,y0,"P"]],xmin:-5,xmax:5,ymin:-Math.max(7,Math.abs(b2)+3),ymax:Math.max(7,Math.abs(b2)+3)})}</div>`,
        type:"line", answer:{kind:"linear",m,b:b2},
        hint:`Keep the slope m = ${m}. Substitute (${x0}, ${y0}) into y = ${m}x + b to find the new b.`,
        solution:`<ol><li>Parallel means the slope stays \(m=${m}\).</li><li>Use point (${x0}, ${y0}): \( ${y0}=${m}(${x0})+b\).</li><li>Solve: \(b=${b2}\).</li><li>Equation: <strong>\( ${lineLatex(m,b2)} \)</strong>.</li></ol>`
    };
}

function q507(d){
    let x1=ri(-4,1), x2=ri(2,5);
    const m=d===1?pick([1,2,-1,-2]):pick([.5,-.5,1.5,-1.5,2,-2]);
    let b=ri(-3,3);
    // Ensure integer y-values for halves by choosing x parity together when needed.
    if(!Number.isInteger(m)){
        x1=pick([-4,-2,0,2]); x2=pick([2,4]);
        if(x2===x1) x2=4;
    }
    const y1=m*x1+b, y2=m*x2+b;
    if(d<3 || Math.random()<.6){
        return {
            skill:"Slope Between Points", instruction:"Calculate the slope.",
            prompt:`<div class="small-prompt"><div class="math-line">\(A(${x1},${fmt(y1)}),\\quad B(${x2},${fmt(y2)})\)</div><p>Find the slope from A to B.</p></div>`,
            type:"number", answer:m,
            hint:"Use m = (y₂ − y₁)/(x₂ − x₁) and keep the subtraction order consistent.",
            solution:`<ol><li>\(\\Delta y=${fmt(y2)}-(${fmt(y1)})=${fmt(y2-y1)}\).</li><li>\(\\Delta x=${x2}-(${x1})=${x2-x1}\).</li><li>\(m=\\frac{${fmt(y2-y1)}}{${x2-x1}}=${fmt(m)}\).</li></ol>`
        };
    }
    return {
        skill:"Two Points → Equation", instruction:"Write the equation of the line.",
        prompt:`<div class="small-prompt"><div class="math-line">\(A(${x1},${fmt(y1)}),\\quad B(${x2},${fmt(y2)})\)</div><p>Write the equation in y = mx + b form.</p></div>`,
        type:"line", answer:{kind:"linear",m,b},
        hint:"Find the slope first, then substitute one point into y = mx + b to solve for b.",
        solution:`<ol><li>\(m=\\frac{${fmt(y2)}-${fmt(y1)}}{${x2}-${x1}}=${fmt(m)}\).</li><li>Use A: \( ${fmt(y1)}=${fmt(m)}(${x1})+b\).</li><li>This gives \(b=${b}\).</li><li>Equation: <strong>\( ${lineLatex(m,b)} \)</strong>.</li></ol>`
    };
}

function q508(d){
    const m=d===1?pick([1,2,3,-1]):nonZeroInt(-4,4), b=ri(-5,5);
    const start=d===1?0:ri(-3,0);
    const xs=[start,start+1,start+2,start+3];
    const ys=xs.map(x=>m*x+b);
    return {
        skill:"Equation from a Table", instruction:"Write the linear equation.",
        prompt:`<div class="small-prompt">${tableHTML(xs,ys)}<p>Write the rule in y = mx + b form.</p></div>`,
        type:"line", answer:{kind:"linear",m,b},
        hint:"Find the constant change in y for each +1 change in x. That is m. Then find b using x = 0 or substitute any row.",
        solution:`<ol><li>Each time x increases by 1, y changes by ${m}, so \(m=${m}\).</li><li>${xs.includes(0)?`At x = 0, y = ${b}, so b = ${b}.`:`Use (${xs[0]}, ${ys[0]}): ${ys[0]} = ${m}(${xs[0]}) + b, so b = ${b}.`}</li><li>Equation: <strong>\( ${lineLatex(m,b)} \)</strong>.</li></ol>`
    };
}

function q509(d){
    const x=ri(-8,10);
    if(d===1){
        const a=pick([2,3,4,5]), b=ri(-8,8), c=a*x+b;
        return {
            skill:"Solving Equations", instruction:"Solve for x.",
            latex:`${a}x${b===0?"":signedTerm(b)}=${c}`,
            type:"number", answer:x,
            hint:`Undo the ${b>=0?"addition":"subtraction"} first, then divide by ${a}.`,
            solution:`<ol><li>\(${a}x${b===0?"":signedTerm(b)}=${c}\)</li><li>${b===0?"No constant to remove.":`${b>0?"Subtract":"Add"} ${Math.abs(b)} on both sides:`} \(${a}x=${a*x}\).</li><li>Divide both sides by ${a}: \(x=${x}\).</li><li>Check in the original equation.</li></ol>`
        };
    }
    const a=pick([2,3,4,5]), k=ri(-5,5), c=a*(x+k);
    const extra=d===3?ri(-6,6):0;
    const rhs=c+extra;
    return {
        skill:"Brackets on One Side", instruction:"Solve for x.",
        latex:`${a}(x${k===0?"":signedTerm(k)})${extra===0?"":signedTerm(extra)}=${rhs}`,
        type:"number", answer:x,
        hint:"Distribute through the bracket first, then combine constants before isolating x.",
        solution:`<ol><li>Distribute: \(${a}x${a*k===0?"":signedTerm(a*k)}${extra===0?"":signedTerm(extra)}=${rhs}\).</li><li>Combine constants: \(${a}x${a*k+extra===0?"":signedTerm(a*k+extra)}=${rhs}\).</li><li>Undo the constant, then divide by ${a}: \(x=${x}\).</li></ol>`
    };
}

function q510(d){
    const x=ri(-7,9);
    if(d<=2){
        let a=nonZeroInt(2,7), c=nonZeroInt(-5,5);
        while(a===c) c=nonZeroInt(-5,5);
        const b=ri(-8,8);
        const dd=a*x+b-c*x;
        return {
            skill:"Variables on Both Sides", instruction:"Solve for x.",
            latex:`${a}x${b===0?"":signedTerm(b)}=${c}x${dd===0?"":signedTerm(dd)}`,
            type:"number", answer:x,
            hint:"Move the x-terms to one side first. Then move the constants.",
            solution:`<ol><li>Subtract \( ${c}x \) from both sides: \(${a-c}x${b===0?"":signedTerm(b)}=${dd}\).</li><li>Move the constant ${b}: \(${a-c}x=${(a-c)*x}\).</li><li>Divide by ${a-c}: \(x=${x}\).</li></ol>`
        };
    }
    let a=pick([2,3,4,5]), c=pick([1,2,3,4]);
    while(a===c) c=pick([1,2,3,4]);
    const p=ri(-4,4), q=ri(-4,4);
    // a(x+p) = c(x+q)+r; choose r to force x
    const r=a*(x+p)-c*(x+q);
    return {
        skill:"Brackets on Both Sides", instruction:"Solve for x.",
        latex:`${a}(x${p===0?"":signedTerm(p)})=${c}(x${q===0?"":signedTerm(q)})${r===0?"":signedTerm(r)}`,
        type:"number", answer:x,
        hint:"Expand both sides completely before collecting variable terms.",
        solution:`<ol><li>Expand: \(${a}x${a*p===0?"":signedTerm(a*p)}=${c}x${c*q+r===0?"":signedTerm(c*q+r)}\).</li><li>Collect x-terms on one side and constants on the other.</li><li>Solve to get <strong>\(x=${x}\)</strong>.</li><li>Verify in the original bracketed equation.</li></ol>`
    };
}

function q511(d){
    const kind=pick(d===1?["number","consecutive"]:["number","consecutive","perimeter","ages"]);
    if(kind==="number"){
        const x=ri(2,20), a=ri(2,5), b=ri(1,10), total=a*x+b;
        return {
            skill:"Forming Equations", instruction:"Form an equation and solve.",
            prompt:`<div class="small-prompt"><p>I think of a number. I multiply it by ${a}, then add ${b}. The result is ${total}. What was the original number?</p></div>`,
            type:"number", answer:x,
            hint:`Let x be the number. The equation is ${a}x + ${b} = ${total}.`,
            solution:`<ol><li>Let x be the original number.</li><li>Equation: \(${a}x+${b}=${total}\).</li><li>Subtract ${b}: \(${a}x=${a*x}\).</li><li>Divide by ${a}: <strong>\(x=${x}\)</strong>.</li></ol>`
        };
    }
    if(kind==="consecutive"){
        const x=ri(5,35), total=3*x+3;
        return {
            skill:"Consecutive Integers", instruction:"Find the smallest integer.",
            prompt:`<div class="small-prompt"><p>The sum of three consecutive integers is <strong>${total}</strong>. What is the smallest integer?</p></div>`,
            type:"number", answer:x,
            hint:"Let the smallest integer be x. The next two are x + 1 and x + 2.",
            solution:`<ol><li>Let the integers be \(x,\ x+1,\ x+2\).</li><li>\(x+(x+1)+(x+2)=${total}\).</li><li>\(3x+3=${total}\Rightarrow3x=${total-3}\).</li><li>\(x=${x}\). The integers are ${x}, ${x+1}, ${x+2}.</li></ol>`
        };
    }
    if(kind==="perimeter"){
        const w=ri(6,25), diff=ri(3,10), l=w+diff, per=2*w+2*l;
        return {
            skill:"Geometry Word Problem", instruction:"Find the width.",
            prompt:`<div class="small-prompt"><p>A rectangle is ${diff} m longer than it is wide. Its perimeter is ${per} m. Find the width.</p></div>`,
            type:"number", answer:w,
            hint:`Let width = x, so length = x + ${diff}. Use 2w + 2l = ${per}.`,
            solution:`<ol><li>Let width = x and length = \(x+${diff}\).</li><li>\(2x+2(x+${diff})=${per}\).</li><li>\(4x+${2*diff}=${per}\Rightarrow4x=${4*w}\).</li><li>Width = <strong>${w} m</strong>.</li></ol>`
        };
    }
    const daughter=ri(8,18), mult=pick([2,3]), years=ri(3,8);
    const mother=mult*daughter, future=mother+daughter+2*years;
    return {
        skill:"Age Problem", instruction:"Find the daughter's current age.",
        prompt:`<div class="small-prompt"><p>A parent is ${mult} times as old as their daughter. In ${years} years, the sum of their ages will be ${future}. How old is the daughter now?</p></div>`,
        type:"number", answer:daughter,
        hint:`Let the daughter's age be x. The parent's age is ${mult}x. In ${years} years, add ${years} to each age.`,
        solution:`<ol><li>Let daughter = x; parent = \(${mult}x\).</li><li>Future equation: \((x+${years})+(${mult}x+${years})=${future}\).</li><li>\(${mult+1}x+${2*years}=${future}\Rightarrow${mult+1}x=${future-2*years}\).</li><li>\(x=${daughter}\). The daughter is <strong>${daughter}</strong>.</li></ol>`
    };
}

function q512(d){
    if(d===1 && Math.random()<.45){
        const value=ri(-4,4), op=pick(["<",">","<=",">="]);
        return {
            skill:"Number Line", instruction:"Write the inequality shown.",
            prompt:`<div class="small-prompt">${numberLineSVG(value,op)}<p>Use x as the variable.</p></div>`,
            type:"inequality", answer:{variable:"x",op,value},
            hint:`${op.includes("=")?"Closed circle means the endpoint is included.":"Open circle means the endpoint is not included."} The arrow shows the direction of all solutions.`,
            solution:`<ol><li>The endpoint is ${value}.</li><li>The circle is ${op.includes("=")?"closed":"open"}, so use ${op.includes("=")?"≤ or ≥":"< or >"}.</li><li>The arrow points ${op.includes(">")?"right":"left"}.</li><li>Answer: <strong>x ${op.replace("<=","≤").replace(">=","≥")} ${value}</strong>.</li></ol>`
        };
    }
    const x=ri(-8,8), op=pick(["<",">","<=",">="]);
    if(d<3){
        const add=ri(-7,7), rhs=x+add;
        return {
            skill:"Solving Inequalities", instruction:"Solve for x.",
            latex:`x${add===0?"":signedTerm(add)} ${op.replace("<=","\\le").replace(">=","\\ge")} ${rhs}`,
            type:"inequality", answer:{variable:"x",op,value:x},
            hint:"Undo the addition or subtraction exactly as you would in an equation.",
            solution:`<ol><li>Undo ${add>=0?"+"+add:String(add)} by applying the inverse operation to both sides.</li><li>This gives \(x ${op.replace("<=","\\le").replace(">=","\\ge")} ${x}\).</li><li>No sign flip is needed because you did not multiply or divide by a negative.</li></ol>`
        };
    }
    const a=-pick([2,3,4,5]), rhs=a*x;
    const flipped=invertOp(op);
    return {
        skill:"Negative Coefficient Inequality", instruction:"Solve for x.",
        latex:`${a}x ${op.replace("<=","\\le").replace(">=","\\ge")} ${rhs}`,
        type:"inequality", answer:{variable:"x",op:flipped,value:x},
        hint:`Divide both sides by ${a}. Because that number is negative, reverse the inequality sign.`,
        solution:`<ol><li>Divide both sides by ${a}.</li><li>Dividing by a negative reverses the inequality.</li><li>\(x ${flipped.replace("<=","\\le").replace(">=","\\ge")} ${x}\).</li></ol>`
    };
}

function q513(d){
    const x=ri(-6,8);
    const op=pick(["<",">","<=",">="]);
    if(d===1){
        const a=pick([2,3,4]), p=ri(-4,4), rhs=a*(x+p);
        return {
            skill:"Inequalities with Brackets", instruction:"Solve for x.",
            latex:`${a}(x${p===0?"":signedTerm(p)}) ${op.replace("<=","\\le").replace(">=","\\ge")} ${rhs}`,
            type:"inequality", answer:{variable:"x",op,value:x},
            hint:"Expand the bracket first. The final coefficient of x is positive, so no sign flip is needed.",
            solution:`<ol><li>Expand: \(${a}x${a*p===0?"":signedTerm(a*p)} ${op.replace("<=","\\le").replace(">=","\\ge")} ${rhs}\).</li><li>Move the constant to the other side.</li><li>Divide by ${a}: \(x ${op.replace("<=","\\le").replace(">=","\\ge")} ${x}\).</li></ol>`
        };
    }
    let a=pick([2,3,4,5]), c=pick([1,2,3,4,5]);
    while(a===c) c=pick([1,2,3,4,5]);
    const p=ri(-3,3), q=ri(-3,3);
    // a(x+p) op c(x+q)+r; set boundary x
    const r=a*(x+p)-c*(x+q);
    const coeff=a-c;
    const finalOp=coeff<0?invertOp(op):op;
    return {
        skill:"Variables on Both Sides", instruction:"Solve the inequality.",
        latex:`${a}(x${p===0?"":signedTerm(p)}) ${op.replace("<=","\\le").replace(">=","\\ge")} ${c}(x${q===0?"":signedTerm(q)})${r===0?"":signedTerm(r)}`,
        type:"inequality", answer:{variable:"x",op:finalOp,value:x},
        hint:"Expand both sides and collect x-terms. If the final coefficient on x is negative, reverse the sign when dividing.",
        solution:`<ol><li>Expand both sides.</li><li>Collect x-terms: the net coefficient is ${coeff}.</li><li>Collect constants so the boundary value is ${x}.</li><li>${coeff<0?"Because the final division is by a negative, reverse the inequality sign.":"The final division is by a positive, so keep the inequality direction."}</li><li>Answer: <strong>\(x ${finalOp.replace("<=","\\le").replace(">=","\\ge")} ${x}\)</strong>.</li></ol>`
    };
}

const generators = {
    lesson501:q501, lesson502:q502, lesson503:q503, lesson504:q504,
    lesson505:q505, lesson506:q506, lesson507:q507, lesson508:q508,
    lesson509:q509, lesson510:q510, lesson511:q511, lesson512:q512, lesson513:q513
};

/* ---------- Rendering ---------- */
function typeset(nodes) {
    if(window.MathJax && typeof window.MathJax.typesetPromise==="function"){
        return window.MathJax.typesetPromise(nodes).catch(()=>{});
    }
    return Promise.resolve();
}
function renderQuestion(q) {
    els.problem.innerHTML="";
    if(q.latex){
        els.problem.innerHTML=`<div class="latex-question">\\[${q.latex}\\]</div>`;
    } else {
        els.problem.innerHTML=q.prompt || "";
    }
    typeset([els.problem]);
}
function renderReveal(box,html) {
    box.innerHTML=html;
    box.hidden=false;
    typeset([box]);
}
function newQuestion() {
    const gen=generators[lessonKey] || q501;
    const d=difficulty();
    state.qnum++;
    state.question=gen(d);
    state.counted=false;
    els.skill.textContent=state.question.skill;
    els.number.textContent=state.qnum;
    els.instruction.textContent=state.question.instruction;
    els.pill.textContent=difficultyNames[d];
    els.label.textContent=difficultyNames[d];
    els.input.value="";
    els.feedback.className="feedback";
    els.feedback.textContent="";
    els.hintBox.hidden=true;
    els.solutionBox.hidden=true;
    renderQuestion(state.question);
    updatePreview();
    els.input.focus({preventScroll:true});
}
function updatePreview(){
    const raw=els.input.value.trim();
    if(!raw){
        els.preview.innerHTML='<span class="answer-preview-placeholder">Your formatted answer will appear here.</span>';
        return;
    }
    if(state.question && (state.question.type==="text"||state.question.type==="list")){
        els.preview.textContent=raw;
        return;
    }
    let tex=stripLatex(raw)
        .replace(/<=/g,"\\le ")
        .replace(/>=/g,"\\ge ");
    els.preview.innerHTML=`\\(${tex}\\)`;
    typeset([els.preview]);
}
function checkCurrent(){
    const q=state.question;
    if(!q) return;
    const raw=els.input.value;
    if(!raw.trim()){
        els.feedback.className="feedback error";
        els.feedback.textContent="Enter an answer first.";
        return;
    }
    const correct=checkAnswer(q,raw);
    if(!state.counted){
        state.progress.attempted++;
        if(correct){ state.progress.correct++; state.progress.streak++; }
        else state.progress.streak=0;
        state.counted=true;
        saveProgress();
        updateProgress();
    }
    if(correct){
        els.feedback.className="feedback success";
        els.feedback.textContent="Correct — nice work. Generate a new problem when you are ready.";
    } else {
        els.feedback.className="feedback error";
        els.feedback.textContent="Not quite. Try the hint, check your signs and substitution, or open the worked solution.";
    }
}
function updateProgress(){
    const p=state.progress;
    const acc=p.attempted?Math.round(100*p.correct/p.attempted):0;
    els.attempted.textContent=p.attempted;
    els.correct.textContent=p.correct;
    els.streak.textContent=p.streak;
    els.accuracy.textContent=`${acc}%`;
    const mastery=Math.min(10,p.correct);
    els.masteryText.textContent=`${mastery} / 10`;
    els.masteryBar.style.width=`${Math.min(100,mastery*10)}%`;
    if(els.ring) els.ring.style.setProperty("--progress",`${acc*3.6}deg`);
    const d=difficulty();
    els.label.textContent=difficultyNames[d];
}
function showTab(name){
    els.tabs.forEach(tab=>{
        const on=tab.dataset.tab===name;
        tab.classList.toggle("active",on);
        tab.setAttribute("aria-selected",String(on));
    });
    els.panels.forEach(panel=>panel.classList.toggle("active",panel.id===name));
    if(name==="practice" && !state.question) newQuestion();
}
function resetProgress(){
    if(!confirm("Reset progress for this lesson?")) return;
    state.progress={attempted:0,correct:0,streak:0};
    saveProgress(); updateProgress();
    state.qnum=0; newQuestion();
}

function init(){
    updateProgress();
    els.tabs.forEach(tab=>tab.addEventListener("click",()=>showTab(tab.dataset.tab)));
    if(els.start) els.start.addEventListener("click",()=>{ showTab("practice"); document.getElementById("practice").scrollIntoView({behavior:"smooth",block:"start"}); });
    els.next.addEventListener("click",newQuestion);
    els.check.addEventListener("click",checkCurrent);
    els.input.addEventListener("input",updatePreview);
    els.input.addEventListener("keydown",e=>{ if(e.key==="Enter") checkCurrent(); });
    els.hint.addEventListener("click",()=>{ if(state.question) renderReveal(els.hintBox,`<strong>Hint</strong><p>${state.question.hint}</p>`); });
    els.solution.addEventListener("click",()=>{ if(state.question) renderReveal(els.solutionBox,`<strong>Worked Solution</strong>${state.question.solution}`); });
    els.reset.addEventListener("click",resetProgress);
    if(els.quizButton) els.quizButton.addEventListener("click",()=>location.href="unit-quiz.html");
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
else init();
})();