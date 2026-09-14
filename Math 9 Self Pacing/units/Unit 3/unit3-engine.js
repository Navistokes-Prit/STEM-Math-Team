(() => {
"use strict";

const lessonKey = document.body.dataset.lesson;
const lessonId = document.body.dataset.lessonId;
const STORAGE_KEY = `math9-unit3-${lessonId}-progress-v2`;

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
    previewHelp: $("answerPreviewHelp"),
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
    quizButton: $("quizLockButton"),
    quizDialog: $("quizDialog")
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
        return { attempted:0, correct:0, streak:0 };
    }
}

function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function ri(a,b) {
    return Math.floor(Math.random()*(b-a+1))+a;
}

function pick(arr) {
    return arr[ri(0,arr.length-1)];
}

function nonZeroInt(min,max) {
    let v=0;
    while(v===0) v=ri(min,max);
    return v;
}

function gcd(a,b) {
    a=Math.abs(a);
    b=Math.abs(b);
    while(b!==0) {
        const r=a%b;
        a=b;
        b=r;
    }
    return a || 1;
}

function difficulty() {
    const p=state.progress;
    const acc=p.attempted ? p.correct/p.attempted : 0;
    if(p.attempted>=7 && p.streak>=3 && acc>=0.8) return 3;
    if(p.attempted>=3 && acc>=0.6) return 2;
    return 1;
}

const difficultyNames = {
    1:"Foundation",
    2:"Standard",
    3:"Challenge"
};

/* =========================================================
   QUESTION / ANSWER LATEX RENDERING
   ========================================================= */

function renderQuestion(question) {
    els.problem.innerHTML="";

    if(question.prompt) {
        const wording=document.createElement("span");
        wording.className="question-wording";
        wording.textContent=question.prompt;
        els.problem.appendChild(wording);
    }

    if(!question.latex) return;

    if(window.MathJax && typeof window.MathJax.tex2chtmlPromise==="function") {
        window.MathJax.tex2chtmlPromise(question.latex,{display:true})
            .then(node => {
                const wrapper=document.createElement("div");
                wrapper.className="latex-question";
                wrapper.appendChild(node);
                els.problem.appendChild(wrapper);
            })
            .catch(() => {
                const fallback=document.createElement("div");
                fallback.textContent=question.latex;
                els.problem.appendChild(fallback);
            });
    } else {
        const fallback=document.createElement("div");
        fallback.textContent=question.latex;
        els.problem.appendChild(fallback);
    }
}

function superscriptToCaret(s) {
    const map={
        "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4",
        "⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁻":"-"
    };
    return String(s ?? "").replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, seq =>
        "^" + [...seq].map(ch => map[ch]).join("")
    );
}

function readBraceGroup(text,start) {
    let i=start;
    while(i<text.length && /\s/.test(text[i])) i++;
    if(text[i]!=="{") return null;
    let depth=0;
    for(let j=i;j<text.length;j++) {
        if(text[j]==="{") depth++;
        else if(text[j]==="}") {
            depth--;
            if(depth===0) return {content:text.slice(i+1,j), next:j+1};
        }
    }
    return null;
}

function convertLatexFractions(text) {
    let result=String(text ?? "");
    for(let safety=0;safety<40;safety++) {
        const index=result.lastIndexOf("\\frac");
        if(index<0) break;
        const num=readBraceGroup(result,index+5);
        if(!num) break;
        const den=readBraceGroup(result,num.next);
        if(!den) break;
        const replacement="((" + convertLatexFractions(num.content) + ")/(" +
            convertLatexFractions(den.content) + "))";
        result=result.slice(0,index)+replacement+result.slice(den.next);
    }
    return result;
}

function latexToParserText(raw) {
    let text=superscriptToCaret(String(raw ?? ""));
    text=text
        .replace(/\$/g,"")
        .replace(/\\left/g,"")
        .replace(/\\right/g,"")
        .replace(/\\,/g,"")
        .replace(/\\;/g,"")
        .replace(/\\!/g,"")
        .replace(/\\cdot/g,"*")
        .replace(/\\times/g,"*")
        .replace(/\\div/g,"/")
        .replace(/[×·]/g,"*")
        .replace(/÷/g,"/")
        .replace(/−/g,"-")
        .replace(/\*\*/g,"^");
    text=convertLatexFractions(text);
    return text.replace(/{/g,"(").replace(/}/g,")").replace(/\s+/g,"");
}

/* =========================================================
   POLYNOMIAL CANONICALIZER
   ========================================================= */

function cleanNumber(v) {
    if(Math.abs(v)<1e-12) return 0;
    const r=Math.round(v);
    if(Math.abs(v-r)<1e-12) return r;
    return v;
}

function monomialKey(vars) {
    return Object.entries(vars)
        .filter(([,p]) => p!==0)
        .sort(([a],[b]) => a.localeCompare(b))
        .map(([name,p]) => `${name}:${p}`)
        .join("|");
}

function keyToVariables(key) {
    if(!key) return {};
    const vars={};
    key.split("|").forEach(part => {
        const [name,p]=part.split(":");
        vars[name]=Number(p);
    });
    return vars;
}

function polyConstant(v) {
    const m=new Map();
    v=cleanNumber(v);
    if(v!==0) m.set("",v);
    return m;
}

function polyVariable(name) {
    return new Map([[monomialKey({[name]:1}),1]]);
}

function polyNormalize(poly) {
    const result=new Map();
    for(const [key,v] of poly.entries()) {
        const c=cleanNumber(v);
        if(c!==0) result.set(key,c);
    }
    return result;
}

function polyAdd(a,b) {
    const result=new Map(a);
    for(const [key,v] of b.entries()) {
        result.set(key,(result.get(key)||0)+v);
    }
    return polyNormalize(result);
}

function polyScale(poly,scalar) {
    const result=new Map();
    for(const [key,v] of poly.entries()) result.set(key,v*scalar);
    return polyNormalize(result);
}

function polySubtract(a,b) {
    return polyAdd(a,polyScale(b,-1));
}

function multiplyVariablePowers(a,b) {
    const result={...a};
    for(const [name,p] of Object.entries(b)) {
        result[name]=(result[name]||0)+p;
        if(result[name]===0) delete result[name];
    }
    return result;
}

function polyMultiply(a,b) {
    const result=new Map();
    for(const [ka,ca] of a.entries()) {
        for(const [kb,cb] of b.entries()) {
            const key=monomialKey(
                multiplyVariablePowers(keyToVariables(ka),keyToVariables(kb))
            );
            result.set(key,(result.get(key)||0)+ca*cb);
        }
    }
    return polyNormalize(result);
}

function polyPower(poly,exp) {
    if(!Number.isInteger(exp) || exp<0) {
        throw new Error("Exponent must be a non-negative integer.");
    }
    let result=polyConstant(1);
    for(let i=0;i<exp;i++) result=polyMultiply(result,poly);
    return result;
}

function polyDivideByMonomial(poly,divisor) {
    if(divisor.size!==1) throw new Error("Only division by one term is supported.");
    const [[dk,dc]]=[...divisor.entries()];
    if(Math.abs(dc)<1e-12) throw new Error("Division by zero.");
    const dvars=keyToVariables(dk);
    const result=new Map();

    for(const [key,c] of poly.entries()) {
        const vars=keyToVariables(key);
        for(const [name,p] of Object.entries(dvars)) {
            vars[name]=(vars[name]||0)-p;
            if(vars[name]===0) delete vars[name];
        }
        result.set(monomialKey(vars),c/dc);
    }
    return polyNormalize(result);
}

function polyEqual(a,b) {
    a=polyNormalize(a); b=polyNormalize(b);
    const keys=new Set([...a.keys(),...b.keys()]);
    for(const key of keys) {
        if(Math.abs((a.get(key)||0)-(b.get(key)||0))>1e-9) return false;
    }
    return true;
}

function polyIsConstant(poly) {
    return poly.size===0 || (poly.size===1 && poly.has(""));
}

function polyConstantValue(poly) {
    if(!polyIsConstant(poly)) return NaN;
    return poly.get("") || 0;
}

/* =========================================================
   PARSER
   ========================================================= */

function tokenize(raw) {
    const text=latexToParserText(raw);
    const tokens=[];
    let i=0;

    while(i<text.length) {
        const ch=text[i];

        if(/[0-9.]/.test(ch)) {
            let j=i+1;
            while(j<text.length && /[0-9.]/.test(text[j])) j++;
            const n=text.slice(i,j);
            if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(n)) throw new Error("Invalid number.");
            tokens.push({type:"number",value:n});
            i=j; continue;
        }

        if(/[a-zA-Z]/.test(ch)) {
            tokens.push({type:"variable",value:ch.toLowerCase()});
            i++; continue;
        }

        if("()+-*/^".includes(ch)) {
            tokens.push({type:ch,value:ch});
            i++; continue;
        }

        throw new Error(`Unsupported symbol: ${ch}`);
    }

    return tokens;
}

function parsePolynomial(raw) {
    const tokens=tokenize(raw);
    if(tokens.length===0) throw new Error("Empty expression.");
    let pos=0;

    const peek=() => tokens[pos];

    function consume(type) {
        const t=peek();
        if(!t || t.type!==type) throw new Error(`Expected ${type}.`);
        pos++;
        return t;
    }

    function beginsPrimary(t) {
        return Boolean(t && (t.type==="number" || t.type==="variable" || t.type==="("));
    }

    function parsePrimary() {
        const t=peek();
        if(!t) throw new Error("Expected a number, variable, or bracket.");

        if(t.type==="number") {
            pos++;
            return polyConstant(Number(t.value));
        }

        if(t.type==="variable") {
            pos++;
            return polyVariable(t.value);
        }

        if(t.type==="(") {
            pos++;
            const value=parseSum();
            consume(")");
            return value;
        }

        throw new Error("Expected a number, variable, or bracket.");
    }

    function parseIntegerExponent() {
        let sign=1;

        if(peek()?.type==="+") pos++;
        else if(peek()?.type==="-") { sign=-1; pos++; }

        if(peek()?.type==="(") {
            pos++;
            let innerSign=1;
            if(peek()?.type==="+") pos++;
            else if(peek()?.type==="-") { innerSign=-1; pos++; }
            const n=consume("number");
            if(!/^\d+$/.test(n.value)) throw new Error("Exponent must be an integer.");
            consume(")");
            return sign*innerSign*Number(n.value);
        }

        const n=consume("number");
        if(!/^\d+$/.test(n.value)) throw new Error("Exponent must be an integer.");
        return sign*Number(n.value);
    }

    function parsePower() {
        let value=parsePrimary();

        while(peek()?.type==="^") {
            pos++;
            const exp=parseIntegerExponent();

            if(exp>=0) {
                value=polyPower(value,exp);
            } else {
                if(value.size!==1) throw new Error("Negative exponent only supported on one term.");
                const [[key,c]]=[...value.entries()];
                const vars=keyToVariables(key);
                const powered={};
                for(const [name,p] of Object.entries(vars)) powered[name]=p*exp;
                value=new Map([[monomialKey(powered),c**exp]]);
            }
        }

        return value;
    }

    function parseUnary() {
        if(peek()?.type==="+") { pos++; return parseUnary(); }
        if(peek()?.type==="-") { pos++; return polyScale(parseUnary(),-1); }
        return parsePower();
    }

    function parseProduct() {
        let value=parseUnary();

        while(pos<tokens.length) {
            const t=peek();

            if(t.type==="*") {
                pos++;
                value=polyMultiply(value,parseUnary());
                continue;
            }

            if(t.type==="/") {
                pos++;
                value=polyDivideByMonomial(value,parseUnary());
                continue;
            }

            if(beginsPrimary(t)) {
                value=polyMultiply(value,parseUnary());
                continue;
            }

            break;
        }

        return value;
    }

    function parseSum() {
        let value=parseProduct();

        while(pos<tokens.length) {
            const t=peek();

            if(t.type==="+") {
                pos++;
                value=polyAdd(value,parseProduct());
                continue;
            }

            if(t.type==="-") {
                pos++;
                value=polySubtract(value,parseProduct());
                continue;
            }

            break;
        }

        return value;
    }

    const result=parseSum();
    if(pos!==tokens.length) throw new Error("Expression could not be fully read.");
    return polyNormalize(result);
}

/* =========================================================
   LIVE ANSWER PREVIEW
   ========================================================= */

function normalizeText(v) {
    return String(v ?? "").trim().toLowerCase().replace(/[.,]/g,"").replace(/\s+/g," ");
}

let previewVersion=0;

function renderAnswerPreview() {
    if(!els.preview) return;

    const raw=els.input.value.trim();
    previewVersion++;
    const version=previewVersion;

    if(!raw) {
        els.preview.innerHTML=
            '<span class="answer-preview-placeholder">Your formatted answer will appear here.</span>';
        if(els.previewHelp) {
            els.previewHelp.textContent=
                "Type ordinary algebra such as 3x^2+5x-4 or LaTeX such as 3x^{2}+5x-4.";
        }
        return;
    }

    if(state.question?.previewMode==="text") {
        els.preview.textContent=raw;
        if(els.previewHelp) {
            els.previewHelp.textContent=
                "This question expects a word or short phrase.";
        }
        return;
    }

    if(!window.MathJax || typeof window.MathJax.tex2chtmlPromise!=="function") {
        els.preview.textContent=raw;
        return;
    }

    window.MathJax.tex2chtmlPromise(raw,{display:true})
        .then(node => {
            if(version!==previewVersion) return;
            els.preview.innerHTML="";
            els.preview.appendChild(node);
            if(els.previewHelp) els.previewHelp.textContent="This is how your answer will be read.";
        })
        .catch(() => {
            if(version!==previewVersion) return;
            els.preview.innerHTML=
                '<span class="answer-preview-placeholder">Keep typing — the preview will appear when the LaTeX is complete.</span>';
            if(els.previewHelp) {
                els.previewHelp.textContent="Check brackets and braces if the preview does not appear.";
            }
        });
}

/* =========================================================
   QUESTION FACTORIES
   ========================================================= */

function qPolynomial(skill,instruction,latex,answer,hint,steps,options={}) {
    return {
        type:"polynomial", previewMode:"math",
        skill,instruction,latex,answer,hint,steps,...options
    };
}

function qNumeric(skill,instruction,latex,answer,hint,steps,options={}) {
    return {
        type:"numeric", previewMode:"math",
        skill,instruction,latex,answer,hint,steps,...options
    };
}

function qText(skill,instruction,latex,answers,hint,steps,options={}) {
    return {
        type:"text", previewMode:"text",
        skill,instruction,latex,answers,hint,steps,...options
    };
}

function qPromptNumeric(skill,instruction,prompt,answer,hint,steps,options={}) {
    return {
        type:"numeric", previewMode:"math",
        skill,instruction,prompt,latex:"",answer,hint,steps,...options
    };
}

function qPromptPolynomial(skill,instruction,prompt,latex,answer,hint,steps,options={}) {
    return {
        type:"polynomial", previewMode:"math",
        skill,instruction,prompt,latex,answer,hint,steps,...options
    };
}

function signedTerm(c,variable="") {
    if(!variable) return String(c);
    if(c===1) return variable;
    if(c===-1) return "-"+variable;
    return String(c)+variable;
}

function joinTerms(terms) {
    let result="";
    terms.forEach((term,index) => {
        if(index===0) {
            result+=term;
        } else if(term.startsWith("-")) {
            result+=" - "+term.slice(1);
        } else {
            result+=" + "+term;
        }
    });
    return result;
}

/* =========================================================
   LESSON GENERATORS
   ========================================================= */

function lesson301(d) {
    const modes=d===1
        ? ["type","parts","substitution","polyYesNo"]
        : d===2
            ? ["type","substitution","polyYesNo","degree"]
            : ["substitution","polyYesNo","degree","parts"];

    const mode=pick(modes);

    if(mode==="type") {
        const n=ri(1,3);
        const expressions={
            1:["5x^2","-7a","9"],
            2:["3x^2-4","a-b","7m+2"],
            3:["2x^2+5x-3","4a-b+8","y^2+3y+1"]
        };
        const labels={1:"monomial",2:"binomial",3:"trinomial"};
        return qText(
            "Polynomial Types","Classify the polynomial.",
            pick(expressions[n]),[labels[n]],
            "Count the terms separated by plus or minus signs.",
            [`The expression has ${n} term${n===1?"":"s"}.`,`Answer: ${labels[n]}.`]
        );
    }

    if(mode==="polyYesNo") {
        const good=Math.random()<0.55;
        const expression=good
            ? pick(["3x^2-5x+7","4a^3+2a","6m-9","x^4+2"])
            : pick(["\\frac{3}{x}","2\\sqrt{x}","5x^{-2}+1","\\frac{x+1}{x}"]);

        return qText(
            "Recognizing Polynomials","Is this a polynomial? Enter yes or no.",
            expression,good?["yes","y"]:["no","n"],
            "Check whether a variable is in a denominator, root, or negative exponent.",
            [
                good
                    ? "The variable powers are whole numbers and no variable is in a denominator or root."
                    : "A variable is in a denominator, root, or negative exponent.",
                `Answer: ${good?"yes":"no"}.`
            ]
        );
    }

    if(mode==="degree") {
        const p=ri(2,d===3?6:4);
        const q=ri(1,d===3?4:3);
        return qNumeric(
            "Degree","Find the degree of the term.",
            `4a^{${p}}b^{${q}}`,p+q,
            "Add the variable exponents in the term.",
            [`${p}+${q}=${p+q}.`,`Answer: ${p+q}.`]
        );
    }

    if(mode==="parts") {
        const c=nonZeroInt(-9,9);
        const k=nonZeroInt(-9,9);
        const e=ri(1,4);
        if(Math.random()<0.5) {
            return qNumeric(
                "Parts of an Expression","What is the coefficient of x?",
                `${signedTerm(c,`x^{${e}}`)} ${k<0?"-":"+"} ${Math.abs(k)}`,c,
                "The coefficient is the signed number multiplying the variable term.",
                [`The x-term is ${signedTerm(c,`x^${e}`)}.`,`Its coefficient is ${c}.`]
            );
        }
        return qNumeric(
            "Parts of an Expression","What is the constant?",
            `${signedTerm(c,`x^{${e}}`)} ${k<0?"-":"+"} ${Math.abs(k)}`,k,
            "The constant is the signed term with no variable.",
            [`The constant term is ${k}.`,`Answer: ${k}.`]
        );
    }

    const x=nonZeroInt(-6,6);
    const a=nonZeroInt(-6,6);
    const b=nonZeroInt(-9,9);
    return qNumeric(
        "Substitution",`Evaluate when x = ${x}.`,
        `${a}x ${b<0?"-":"+"} ${Math.abs(b)}`,a*x+b,
        "Replace x with the given value using brackets.",
        [`Substitute x=${x}.`,`${a}(${x}) ${b<0?"-":"+"} ${Math.abs(b)}.`,`Answer: ${a*x+b}.`]
    );
}

function lesson302(d) {
    if(d===1 && Math.random()<0.4) {
        const a=nonZeroInt(-8,8);
        const b=nonZeroInt(-8,8);
        return qPolynomial(
            "Collecting Like Terms","Simplify.",
            `${a}x ${b<0?"-":"+"} ${Math.abs(b)}x`,
            `${a+b}x`,
            "Both terms are x-terms, so combine their coefficients.",
            [`${a}+(${b})=${a+b}.`,`Answer: ${a+b}x.`]
        );
    }

    const ax1=nonZeroInt(-9,9), ax2=nonZeroInt(-9,9);
    const ay1=nonZeroInt(-7,7), ay2=nonZeroInt(-7,7);
    const c1=d>=2?nonZeroInt(-9,9):0;
    const c2=d>=2?nonZeroInt(-9,9):0;

    const xTotal=ax1+ax2, yTotal=ay1+ay2, cTotal=c1+c2;
    const latex=joinTerms([
        signedTerm(ax1,"x"), signedTerm(ay1,"y"),
        ...(c1!==0?[String(c1)]:[]),
        signedTerm(ax2,"x"), signedTerm(ay2,"y"),
        ...(c2!==0?[String(c2)]:[])
    ]);

    const answer=joinTerms([
        ...(xTotal!==0?[signedTerm(xTotal,"x")]:[]),
        ...(yTotal!==0?[signedTerm(yTotal,"y")]:[]),
        ...(cTotal!==0?[String(cTotal)]:[])
    ]) || "0";

    return qPolynomial(
        "Collecting Like Terms","Simplify fully.",latex,answer,
        "Group x-terms, y-terms, and constants separately.",
        [
            `x coefficients: ${ax1}+(${ax2})=${xTotal}.`,
            `y coefficients: ${ay1}+(${ay2})=${yTotal}.`,
            ...(d>=2?[`Constants: ${c1}+(${c2})=${cTotal}.`]:[]),
            `Answer: ${answer}.`
        ]
    );
}

function lesson303(d) {
    const v=pick(["x","a","b","m"]);

    if(d===1 || Math.random()<0.5) {
        const outside=nonZeroInt(d===1?2:-6,d===1?7:7);
        const insideCoef=d===1?1:nonZeroInt(-5,5);
        const constant=nonZeroInt(-9,9);
        const inside=joinTerms([signedTerm(insideCoef,v),String(constant)]);
        const answer=joinTerms([
            signedTerm(outside*insideCoef,v),
            String(outside*constant)
        ]);

        return qPolynomial(
            "Distribution","Expand.",
            `${outside}\\left(${inside}\\right)`,answer,
            "Multiply the outside factor by every term inside.",
            [
                `${outside}(${signedTerm(insideCoef,v)})=${signedTerm(outside*insideCoef,v)}.`,
                `${outside}(${constant})=${outside*constant}.`,
                `Answer: ${answer}.`
            ]
        );
    }

    const insideCoef=nonZeroInt(-5,5);
    const constant=nonZeroInt(-8,8);
    const answer=joinTerms([
        signedTerm(insideCoef,`${v}^2`),
        signedTerm(constant,v)
    ]);

    return qPolynomial(
        "Variable Distribution","Expand.",
        `${v}\\left(${joinTerms([signedTerm(insideCoef,v),String(constant)])}\\right)`,
        answer,
        "Multiply the outside variable by both terms.",
        [
            `${v}(${signedTerm(insideCoef,v)})=${signedTerm(insideCoef,`${v}^2`)}.`,
            `${v}(${constant})=${signedTerm(constant,v)}.`,
            `Answer: ${answer}.`
        ]
    );
}

function lesson304(d) {
    const v=pick(["x","a","y"]);
    const k1=nonZeroInt(d===1?2:-6,d===1?6:6);
    const k2=nonZeroInt(d===1?2:-6,d===1?6:6);
    const a=nonZeroInt(-5,5), b=nonZeroInt(-7,7);
    const c=nonZeroInt(-5,5), e=nonZeroInt(-7,7);
    const power=d===3?2:1;
    const varTerm=power===1?v:`${v}^2`;
    const coeff=k1*a+k2*c;
    const constant=k1*b+k2*e;

    const answer=joinTerms([
        ...(coeff!==0?[signedTerm(coeff,varTerm)]:[]),
        ...(constant!==0?[String(constant)]:[])
    ]) || "0";

    return qPolynomial(
        "Expand and Simplify","Expand and simplify.",
        `${k1}\\left(${joinTerms([signedTerm(a,varTerm),String(b)])}\\right)+${k2}\\left(${joinTerms([signedTerm(c,varTerm),String(e)])}\\right)`,
        answer,
        "Expand both brackets completely, then collect like terms.",
        [
            "Distribute both outside coefficients.",
            `Combine the ${varTerm} terms.`,
            "Combine the constants.",
            `Answer: ${answer}.`
        ]
    );
}

function lesson305(d) {
    if(d===1 && Math.random()<0.45) {
        const g=ri(2,12);
        const a=g*ri(2,8);
        const b=g*ri(2,8);
        const ans=gcd(a,b);
        return qNumeric(
            "Greatest Common Factor","Find the greatest common factor.",
            `${a}\\text{ and }${b}`,ans,
            "Find the largest integer that divides both numbers.",
            [`The greatest common factor is ${ans}.`]
        );
    }

    const v=pick(["x","a","b","m"]);
    const outerCoef=d===1?ri(2,6):nonZeroInt(-7,7);
    const outsidePower=d===1?0:ri(1,d===3?3:2);
    const insideA=d===1?ri(2,8):nonZeroInt(-7,7);
    const insideB=nonZeroInt(-9,9);
    const extraPower=ri(1,d===3?3:2);

    const term1Coef=outerCoef*insideA;
    const term2Coef=outerCoef*insideB;
    const p1=outsidePower+extraPower;
    const p2=outsidePower;

    const first=signedTerm(term1Coef,p1===0?"":(p1===1?v:`${v}^${p1}`));
    const second=signedTerm(term2Coef,p2===0?"":(p2===1?v:`${v}^${p2}`));
    const outside=signedTerm(outerCoef,outsidePower===0?"":(outsidePower===1?v:`${v}^${outsidePower}`));
    const inside=joinTerms([
        signedTerm(insideA,extraPower===1?v:`${v}^${extraPower}`),
        String(insideB)
    ]);
    const original=joinTerms([first,second]);
    const answer=`${outside}(${inside})`;

    return qPolynomial(
        "Factoring by GCF","Factor fully.",
        original,answer,
        "Find the greatest common numerical factor and the smallest common variable exponent.",
        [
            `The greatest common factor is ${outside}.`,
            `Divide each term by ${outside}.`,
            `Answer: ${answer}.`
        ],
        {requireFactored:true, requiredOuterFactor:outside}
    );
}

function lesson306(d) {
    const mode=pick(d===1?["degree","equivalent"]:["degree","equivalent","leading"]);

    if(mode==="degree") {
        const p=ri(2,d===3?6:4);
        const q=ri(1,d===3?4:3);
        const lower=ri(1,p+q-1);
        return qNumeric(
            "Degree of a Polynomial","Find the degree.",
            `3a^{${p}}b^{${q}}-2x^{${lower}}+5`,p+q,
            "For a multivariable term, add its exponents. Then choose the largest term degree.",
            [`First term degree: ${p}+${q}=${p+q}.`,`Answer: ${p+q}.`]
        );
    }

    if(mode==="leading") {
        const degree=ri(2,6);
        const leading=nonZeroInt(-9,9);
        const lower=ri(1,degree-1);
        return qNumeric(
            "Leading Coefficient","What is the leading coefficient?",
            `${leading}x^{${degree}}+${ri(2,8)}x^{${lower}}-${ri(1,9)}`,
            leading,
            "Find the highest-degree term and read its coefficient.",
            [`The highest-degree term is ${leading}x^${degree}.`,`Answer: ${leading}.`]
        );
    }

    const a=nonZeroInt(-6,6), b=nonZeroInt(-6,6), c=nonZeroInt(-8,8);
    const combined=a+b;
    const left=joinTerms([signedTerm(a,"x"),signedTerm(b,"x"),String(c)]);
    const equivalent=Math.random()<0.65;
    const right=equivalent
        ? joinTerms([signedTerm(combined,"x"),String(c)])
        : joinTerms([signedTerm(combined+pick([-2,-1,1,2]),"x"),String(c)]);

    return qText(
        "Equivalent Polynomials","Are the two polynomials equivalent? Enter yes or no.",
        `${left}\\quad\\text{and}\\quad${right}`,
        equivalent?["yes","y"]:["no","n"],
        "Simplify both expressions and compare.",
        [
            `The left side simplifies to ${joinTerms([signedTerm(combined,"x"),String(c)])}.`,
            `The right side is ${right}.`,
            `Answer: ${equivalent?"yes":"no"}.`
        ]
    );
}

function lesson307(d) {
    const mode=pick(
        d===1?["rectangle","triangle","perimeter"]:
        d===2?["rectangle","triangle","parallelogram","circle"]:
        ["triangle","parallelogram","trapezoid","circle"]
    );

    if(mode==="perimeter") {
        const l=ri(4,18), w=ri(3,14);
        return qPromptNumeric(
            "Perimeter Review","Enter the numerical answer only.",
            `A rectangle is ${l} cm long and ${w} cm wide. Find its perimeter in centimetres.`,
            2*(l+w),
            "A rectangle has two lengths and two widths.",
            [`P=2l+2w.`,`P=2(${l})+2(${w})=${2*(l+w)} cm.`]
        );
    }

    if(mode==="rectangle") {
        const l=ri(4,20), w=ri(3,15);
        return qPromptNumeric(
            "Area of a Rectangle","Enter the numerical answer only.",
            `A rectangle has length ${l} cm and width ${w} cm. Find its area in cm².`,
            l*w,
            "Area of a rectangle is length × width.",
            [`A=lw.`,`A=${l}(${w})=${l*w} cm².`]
        );
    }

    if(mode==="triangle") {
        const b=ri(4,20), h=ri(3,15);
        return qPromptNumeric(
            "Area of a Triangle","Enter the numerical answer only.",
            `A triangle has base ${b} cm and perpendicular height ${h} cm. Find its area in cm².`,
            b*h/2,
            "Use one-half × base × perpendicular height.",
            [`A=½bh.`,`A=½(${b})(${h})=${b*h/2} cm².`]
        );
    }

    if(mode==="parallelogram") {
        const b=ri(5,20), h=ri(3,14);
        return qPromptNumeric(
            "Area of a Parallelogram","Enter the numerical answer only.",
            `A parallelogram has base ${b} m and perpendicular height ${h} m. Find its area in m².`,
            b*h,
            "Use base × perpendicular height.",
            [`A=bh.`,`A=${b}(${h})=${b*h} m².`]
        );
    }

    if(mode==="trapezoid") {
        const a=ri(4,12), b=ri(a+1,a+10), h=ri(3,10);
        return qPromptNumeric(
            "Area of a Trapezoid","Enter the numerical answer only.",
            `A trapezoid has parallel sides ${a} cm and ${b} cm with height ${h} cm. Find its area in cm².`,
            (a+b)*h/2,
            "Add the parallel sides, multiply by the height, then divide by 2.",
            [`A=½(a+b)h.`,`A=½(${a}+${b})(${h})=${(a+b)*h/2} cm².`]
        );
    }

    const r=ri(2,12);
    const answer=Math.round(Math.PI*r*r*10)/10;
    return qPromptNumeric(
        "Area of a Circle","Round your answer to the nearest tenth.",
        `A circle has radius ${r} cm. Find its area in cm².`,
        answer,
        "Use A = πr².",
        [`A=π(${r})².`,`A≈${(Math.PI*r*r).toFixed(2)}.`,`Nearest tenth: ${answer} cm².`],
        {tolerance:0.05}
    );
}

function lesson308(d) {
    const mode=pick(
        d===1?["rectangular","baseArea"]:
        d===2?["rectangular","triangular","baseArea"]:
        ["triangular","composite","baseArea"]
    );

    if(mode==="baseArea") {
        const area=ri(12,60), length=ri(3,18);
        return qPromptNumeric(
            "Volume from Base Area","Enter the numerical answer only.",
            `A prism has base area ${area} cm² and length ${length} cm. Find its volume in cm³.`,
            area*length,
            "Volume of a prism is base area × prism length.",
            [`V=A_base×length.`,`V=${area}(${length})=${area*length} cm³.`]
        );
    }

    if(mode==="rectangular") {
        const l=ri(3,14), w=ri(3,12), h=ri(3,15);
        return qPromptNumeric(
            "Rectangular Prism","Enter the numerical answer only.",
            `A rectangular prism measures ${l} cm by ${w} cm by ${h} cm. Find its volume in cm³.`,
            l*w*h,
            "Multiply the three perpendicular dimensions.",
            [`V=lwh.`,`V=${l}(${w})(${h})=${l*w*h} cm³.`]
        );
    }

    if(mode==="triangular") {
        const b=ri(4,16), h=ri(3,12), length=ri(4,18);
        return qPromptNumeric(
            "Triangular Prism","Enter the numerical answer only.",
            `A triangular prism has a triangular base with base ${b} cm and height ${h} cm. The prism is ${length} cm long. Find its volume in cm³.`,
            b*h*length/2,
            "Find the triangle area first, then multiply by prism length.",
            [`Base area=½(${b})(${h})=${b*h/2} cm².`,`V=${b*h/2}(${length})=${b*h*length/2} cm³.`]
        );
    }

    const W=ri(7,14), H=ri(7,14);
    const cutW=ri(2,W-3), cutH=ri(2,H-3), length=ri(3,10);
    const baseArea=W*H-cutW*cutH;

    return qPromptNumeric(
        "Composite Prism","Enter the numerical answer only.",
        `An L-shaped prism has a base formed from a ${W} cm × ${H} cm rectangle with a ${cutW} cm × ${cutH} cm corner removed. The prism length is ${length} cm. Find the volume in cm³.`,
        baseArea*length,
        "Find the L-shaped base area by subtraction, then multiply by the prism length.",
        [
            `Outer area=${W*H} cm².`,
            `Removed area=${cutW*cutH} cm².`,
            `Base area=${baseArea} cm².`,
            `V=${baseArea}(${length})=${baseArea*length} cm³.`
        ]
    );
}

function lesson309(d) {
    const mode=pick(
        d===1?["variableArea","conversion"]:
        d===2?["variableArea","variableVolume","conversion"]:
        ["variableArea","variableVolume","surfaceArea","conversion"]
    );

    if(mode==="conversion") {
        const m2=ri(2,60);
        return qPromptNumeric(
            "Area Unit Conversion","Enter the numerical answer only.",
            `Convert ${m2} m² to cm².`,
            m2*10000,
            "1 m² = 10,000 cm².",
            [`${m2}×10,000=${m2*10000}.`,`Answer: ${m2*10000} cm².`]
        );
    }

    if(mode==="variableArea") {
        const a=ri(1,7), k=ri(2,8);
        const answer=`${k}x^2+${k*a}x`;
        return qPromptPolynomial(
            "Area with Variables","Write a simplified expression for the area.",
            `A rectangle has length x + ${a} and width ${k}x.`,
            `A=\\left(x+${a}\\right)\\left(${k}x\\right)`,
            answer,
            "Area = length × width. Expand the product.",
            [`A=(x+${a})(${k}x).`,`A=${answer}.`]
        );
    }

    if(mode==="variableVolume") {
        const a=ri(1,6), k=ri(2,7), h=ri(2,8);
        const answer=`${k*h}x^2+${k*a*h}x`;
        return qPromptPolynomial(
            "Volume with Variables","Write a simplified expression for the volume.",
            `A rectangular prism has base dimensions x + ${a} and ${k}x, and height ${h}.`,
            `V=\\left(x+${a}\\right)\\left(${k}x\\right)\\left(${h}\\right)`,
            answer,
            "Multiply the three dimensions, then expand.",
            [`V=(x+${a})(${k}x)(${h}).`,`Answer: ${answer}.`]
        );
    }

    const l=ri(2,10), w=ri(2,9), h=ri(2,8);
    const answer=2*(l*w+l*h+w*h);
    return qPromptNumeric(
        "Surface Area","Enter the numerical answer only.",
        `A rectangular prism measures ${l} cm by ${w} cm by ${h} cm. Find its surface area in cm².`,
        answer,
        "A rectangular prism has two of each face: lw, lh, and wh.",
        [`SA=2(lw+lh+wh).`,`SA=${answer} cm².`]
    );
}

function lesson310(d) {
    const mode=pick(
        d===1?["represent","expandTiles"]:
        d===2?["represent","expandTiles","divideTiles"]:
        ["expandTiles","divideTiles","mixed"]
    );

    if(mode==="represent") {
        const xTiles=nonZeroInt(-6,6);
        const units=nonZeroInt(-9,9);
        const answer=joinTerms([signedTerm(xTiles,"x"),String(units)]);
        return qPromptPolynomial(
            "Representing Algebra Tiles","Write the expression represented by the tiles.",
            `The model contains ${Math.abs(xTiles)} ${xTiles>0?"positive":"negative"} x-tile${Math.abs(xTiles)===1?"":"s"} and ${Math.abs(units)} ${units>0?"positive":"negative"} unit tile${Math.abs(units)===1?"":"s"}.`,
            "",answer,
            "Translate x-tiles into x terms and unit tiles into constants.",
            [`x-tiles represent ${signedTerm(xTiles,"x")}.`,`Unit tiles represent ${units}.`,`Answer: ${answer}.`]
        );
    }

    if(mode==="expandTiles") {
        const groups=nonZeroInt(d===3?-5:2,6);
        const c=nonZeroInt(-7,7);
        const answer=joinTerms([signedTerm(groups,"x"),String(groups*c)]);
        return qPolynomial(
            "Distribution with Tiles","Expand.",
            `${groups}\\left(x ${c<0?"-":"+"} ${Math.abs(c)}\\right)`,
            answer,
            "Think of the outside number as the number of equal groups.",
            [`${groups}(x)=${groups}x.`,`${groups}(${c})=${groups*c}.`,`Answer: ${answer}.`]
        );
    }

    if(mode==="divideTiles") {
        const divisor=ri(2,6);
        const xpg=nonZeroInt(-6,6);
        const cpg=nonZeroInt(-8,8);
        const numerator=joinTerms([signedTerm(divisor*xpg,"x"),String(divisor*cpg)]);
        const answer=joinTerms([signedTerm(xpg,"x"),String(cpg)]);
        return qPolynomial(
            "Dividing with Tiles","Simplify.",
            `\\frac{${numerator}}{${divisor}}`,
            answer,
            `Split every tile into ${divisor} equal groups.`,
            [`${divisor*xpg}x÷${divisor}=${xpg}x.`,`${divisor*cpg}÷${divisor}=${cpg}.`,`Answer: ${answer}.`]
        );
    }

    const k=ri(2,6), a=ri(1,7);
    return qPolynomial(
        "Mixed Unit Review","Expand and simplify.",
        `${k}(x+${a})-2x`,
        `${k-2}x+${k*a}`,
        "Expand the bracket, then collect the x-terms.",
        [`${k}(x+${a})=${k}x+${k*a}.`,`Answer: ${k-2}x+${k*a}.`]
    );
}

const generators = {
    lesson301,lesson302,lesson303,lesson304,lesson305,
    lesson306,lesson307,lesson308,lesson309,lesson310
};

/* =========================================================
   VALIDATION
   ========================================================= */

function near(a,b,tolerance=1e-9) {
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b)<=tolerance;
}

function parseFlexibleNumeric(raw) {
    try {
        const p=parsePolynomial(raw);
        if(!polyIsConstant(p)) return NaN;
        return polyConstantValue(p);
    } catch {
        return Number(String(raw ?? "").trim().replace(/,/g,""));
    }
}

function outerFactorMatches(raw,expectedFactor) {
    const text=latexToParserText(raw);
    const i=text.indexOf("(");
    if(i<=0) return false;

    try {
        return polyEqual(
            parsePolynomial(text.slice(0,i)),
            parsePolynomial(expectedFactor)
        );
    } catch {
        return false;
    }
}

function validate(question,raw) {
    if(question.type==="text") {
        const entered=normalizeText(raw);
        if(!entered) return {valid:false,message:"Enter your answer."};
        return {
            valid:true,
            correct:question.answers.some(a => normalizeText(a)===entered)
        };
    }

    if(question.type==="numeric") {
        const value=parseFlexibleNumeric(raw);
        if(!Number.isFinite(value)) {
            return {
                valid:false,
                message:"Enter a numerical answer. LaTeX fractions are accepted."
            };
        }
        return {
            valid:true,
            correct:near(value,question.answer,question.tolerance ?? 1e-9)
        };
    }

    if(question.type==="polynomial") {
        if(!String(raw ?? "").trim()) {
            return {valid:false,message:"Enter an algebraic expression."};
        }

        let entered,expected;

        try {
            entered=parsePolynomial(raw);
        } catch {
            return {
                valid:false,
                message:"I could not read that expression yet. Check the live preview, signs, brackets, and exponents."
            };
        }

        try {
            expected=parsePolynomial(question.answer);
        } catch {
            return {
                valid:false,
                message:"This generated question could not be checked. Generate a new problem."
            };
        }

        if(!polyEqual(entered,expected)) return {valid:true,correct:false};

        if(question.requireFactored) {
            if(!String(raw).includes("(") || !String(raw).includes(")")) {
                return {
                    valid:true,
                    correct:false,
                    representationMessage:"Your expression is mathematically equivalent, but the question asks for factored form."
                };
            }

            if(question.requiredOuterFactor &&
               !outerFactorMatches(raw,question.requiredOuterFactor)) {
                return {
                    valid:true,
                    correct:false,
                    representationMessage:
                        `Your expression is equivalent, but it is not fully factored using the greatest common factor ${question.requiredOuterFactor}.`
                };
            }
        }

        return {valid:true,correct:true};
    }

    return {valid:false,message:"Unable to check this answer."};
}

/* =========================================================
   UI
   ========================================================= */

function setTab(name) {
    els.tabs.forEach(tab => {
        const active=tab.dataset.tab===name;
        tab.classList.toggle("active",active);
        tab.setAttribute("aria-selected",String(active));
    });

    els.panels.forEach(panel => {
        panel.classList.toggle("active",panel.id===name);
    });

    if(name==="practice") {
        setTimeout(() => els.input?.focus(),50);
    }
}

function newQuestion() {
    const generator=generators[lessonKey];
    if(!generator) return;

    const d=difficulty();
    state.qnum++;
    state.question={...generator(d),difficulty:d};
    state.counted=false;

    const q=state.question;
    els.skill.textContent=q.skill;
    els.number.textContent=state.qnum;
    els.instruction.textContent=q.instruction;
    els.pill.textContent=difficultyNames[d];
    els.label.textContent=difficultyNames[d];

    renderQuestion(q);

    els.input.value="";
    renderAnswerPreview();

    els.feedback.className="feedback";
    els.feedback.textContent="";
    els.hintBox.hidden=true;
    els.solutionBox.hidden=true;
    els.hint.textContent="Hint";
    els.solution.textContent="Show Solution";
    els.input.focus();
}

function checkAnswer() {
    const q=state.question;
    if(!q) return;

    const result=validate(q,els.input.value);

    if(!result.valid) {
        els.feedback.className="feedback info";
        els.feedback.textContent=result.message;
        return;
    }

    if(!state.counted) {
        state.progress.attempted++;

        if(result.correct) {
            state.progress.correct++;
            state.progress.streak++;
        } else {
            state.progress.streak=0;
        }

        state.counted=true;
        saveProgress();
        renderProgress();
    }

    if(result.correct) {
        els.feedback.className="feedback success";
        els.feedback.textContent="Correct. Nice work.";
    } else if(result.representationMessage) {
        els.feedback.className="feedback info";
        els.feedback.textContent=result.representationMessage;
    } else {
        els.feedback.className="feedback error";
        els.feedback.textContent="Not quite. Check the algebra, try the hint, or view the worked solution.";
    }
}

function toggleHint() {
    if(!state.question) return;
    const open=els.hintBox.hidden;
    els.hintBox.hidden=!open;
    els.hint.textContent=open?"Hide Hint":"Hint";
    if(open) {
        els.hintBox.innerHTML=`<strong>Hint</strong><p>${state.question.hint}</p>`;
    }
}

function toggleSolution() {
    if(!state.question) return;
    const open=els.solutionBox.hidden;
    els.solutionBox.hidden=!open;
    els.solution.textContent=open?"Hide Solution":"Show Solution";
    if(open) {
        els.solutionBox.innerHTML=
            `<strong>Worked Solution</strong><ol>${
                state.question.steps.map(step => `<li>${step}</li>`).join("")
            }</ol>`;
    }
}

function renderProgress() {
    const p=state.progress;
    const accuracy=p.attempted?Math.round((p.correct/p.attempted)*100):0;

    els.attempted.textContent=p.attempted;
    els.correct.textContent=p.correct;
    els.streak.textContent=p.streak;
    els.accuracy.textContent=`${accuracy}%`;
    els.ring.style.setProperty("--progress",`${accuracy*3.6}deg`);
    els.masteryBar.style.width=`${Math.min(100,p.attempted*10)}%`;
    els.masteryText.textContent=
        p.attempted>=10 && accuracy>=80
            ? "Completed ✓"
            : `${Math.min(10,p.attempted)} / 10`;
    els.label.textContent=difficultyNames[difficulty()];
}

function resetProgress() {
    if(!confirm(`Reset saved progress for Lesson ${lessonId}?`)) return;
    state.progress={attempted:0,correct:0,streak:0};
    state.qnum=0;
    saveProgress();
    renderProgress();
    newQuestion();
}

/* =========================================================
   EVENTS
   ========================================================= */

els.tabs.forEach(tab => {
    tab.addEventListener("click",() => setTab(tab.dataset.tab));
});

els.start?.addEventListener("click",() => setTab("practice"));
els.check?.addEventListener("click",checkAnswer);
els.input?.addEventListener("input",renderAnswerPreview);
els.input?.addEventListener("keydown",event => {
    if(event.key==="Enter") checkAnswer();
});
els.hint?.addEventListener("click",toggleHint);
els.solution?.addEventListener("click",toggleSolution);
els.next?.addEventListener("click",newQuestion);
els.reset?.addEventListener("click",resetProgress);
els.quizButton?.addEventListener("click",() => els.quizDialog?.showModal());

renderProgress();
newQuestion();

})();
