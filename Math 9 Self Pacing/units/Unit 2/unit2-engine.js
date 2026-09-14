(() => {
"use strict";

const lessonKey = document.body.dataset.lesson;
const lessonId = document.body.dataset.lessonId;
const STORAGE_KEY = `math9-unit2-${lessonId}-progress-v2`;

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
        return { attempted: 0, correct: 0, streak: 0 };
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
    let x=0;
    while(x===0) x=ri(min,max);
    return x;
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
   LATEX / MATHJAX RENDERING

   The generators can continue using simple HTML-style
   superscripts internally. Before a question is displayed,
   it is converted to LaTeX and rendered by MathJax.

   This prevents exponents, multiplication signs, brackets,
   and fractions from wrapping or stacking incorrectly.
   ========================================================= */

function mathHTMLToLatex(source) {

    let latex = String(source ?? "").trim();

    // Convert HTML superscripts to LaTeX exponents.
    latex = latex.replace(
        /<sup>(.*?)<\/sup>/g,
        "^{$1}"
    );

    // Standard mathematical operators.
    latex = latex
        .replace(/×/g, "\\times ")
        .replace(/÷/g, "\\div ")
        .replace(/−/g, "-");

    /*
       Make power-of-a-quotient questions display as a
       proper stacked fraction, for example:

       (2a^2/3b)^2

       becomes

       \left(\frac{2a^{2}}{3b}\right)^{2}
    */
    const poweredFraction =
        latex.match(
            /^\(([^()]+)\/([^()]+)\)\^\{([^{}]+)\}$/
        );

    if (poweredFraction) {

        latex =
            "\\left(" +
            "\\frac{" + poweredFraction[1] + "}" +
            "{" + poweredFraction[2] + "}" +
            "\\right)^{" + poweredFraction[3] + "}";

    }

    return latex;
}


function renderMathQuestion(question) {

    /*
       Word/application prompts sometimes intentionally contain
       regular HTML text. Those are left as normal HTML.
    */

    if (
        question.html.includes(
            'class="small-prompt"'
        )
    ) {

        els.problem.innerHTML =
            question.html;

        return;

    }


    const latex =
        mathHTMLToLatex(
            question.html
        );


    /*
       MathJax is loaded before unit2-engine.js on every
       lesson page, so it is available here.
    */

    if (
        window.MathJax &&
        typeof window.MathJax.tex2chtmlPromise === "function"
    ) {

        els.problem.innerHTML = "";

        window.MathJax
            .tex2chtmlPromise(
                latex,
                {
                    display: true
                }
            )
            .then(node => {

                els.problem.innerHTML = "";

                const wrapper =
                    document.createElement(
                        "div"
                    );

                wrapper.className =
                    "latex-question";

                wrapper.appendChild(
                    node
                );

                els.problem.appendChild(
                    wrapper
                );

            })
            .catch(() => {

                /*
                   Fallback: if MathJax ever fails to render,
                   students still see the question rather than
                   a blank practice card.
                */

                els.problem.textContent =
                    latex;

            });

    }

    else {

        /*
           Very unlikely fallback for slow/blocked CDN loading.
        */

        els.problem.textContent =
            latex;

    }

}

function superscriptToCaret(s) {
    const map = {
        "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4",
        "⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9",
        "⁻":"-"
    };

    return String(s ?? "").replace(
        /[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g,
        sequence => {
            return "^" + [...sequence]
                .map(character => map[character])
                .join("");
        }
    );
}


/* =========================================================
   STUDENT LATEX INPUT
   ========================================================= */

/*
   Students may type common classroom LaTeX such as:

   3^5
   3^{5}
   12a^6
   -2a^{4}
   x^{-3}
   \frac{x^8}{x^3}
   (3x^2)^4

   The preview is rendered by MathJax.

   For checking, we convert the expression into a canonical
   monomial representation. This means harmless formatting
   differences do NOT matter.
*/


function readBraceGroup(text, startIndex) {

    let i=startIndex;

    while(
        i<text.length &&
        /\s/.test(text[i])
    ) {
        i++;
    }

    if(text[i]!=="{") {
        return null;
    }

    let depth=0;

    for(
        let j=i;
        j<text.length;
        j++
    ) {

        if(text[j]==="{") {
            depth++;
        }

        else if(text[j]==="}") {

            depth--;

            if(depth===0) {
                return {
                    content:
                        text.slice(i+1,j),
                    next:
                        j+1
                };
            }

        }

    }

    return null;
}


function convertLatexFractions(text) {

    let result=String(text ?? "");

    /*
       Convert \frac{A}{B} recursively into
       ((A)/(B)) so the algebra parser can read it.
    */

    for(let safety=0; safety<30; safety++) {

        const index=result.lastIndexOf("\\frac");

        if(index<0) {
            break;
        }

        const numerator=
            readBraceGroup(
                result,
                index+5
            );

        if(!numerator) {
            break;
        }

        const denominator=
            readBraceGroup(
                result,
                numerator.next
            );

        if(!denominator) {
            break;
        }

        const replacement =
            "((" +
            convertLatexFractions(
                numerator.content
            ) +
            ")/(" +
            convertLatexFractions(
                denominator.content
            ) +
            "))";

        result =
            result.slice(0,index) +
            replacement +
            result.slice(
                denominator.next
            );

    }

    return result;
}


function latexToParserText(raw) {

    let text=
        superscriptToCaret(
            String(raw ?? "")
        );

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

    text=
        convertLatexFractions(
            text
        );

    /*
       Braces used around exponents are grouping symbols
       mathematically, so they can safely become parentheses.
    */

    text=text
        .replace(/{/g,"(")
        .replace(/}/g,")")
        .replace(/\s+/g,"");

    return text;
}


/* =========================================================
   EXACT RATIONAL ARITHMETIC
   ========================================================= */

function bigintGcd(a,b) {

    a=a<0n ? -a : a;
    b=b<0n ? -b : b;

    while(b!==0n) {
        const remainder=a%b;
        a=b;
        b=remainder;
    }

    return a===0n ? 1n : a;
}


function rational(numerator,denominator=1n) {

    if(denominator===0n) {
        throw new Error(
            "Division by zero."
        );
    }

    if(denominator<0n) {
        numerator=-numerator;
        denominator=-denominator;
    }

    const divisor=
        bigintGcd(
            numerator,
            denominator
        );

    return {
        n:numerator/divisor,
        d:denominator/divisor
    };
}


function rationalFromString(text) {

    const value=String(text);

    if(value.includes(".")) {

        const negative=
            value.startsWith("-");

        const clean=
            negative
                ? value.slice(1)
                : value;

        const parts=
            clean.split(".");

        const whole=
            parts[0] || "0";

        const decimal=
            parts[1] || "";

        const denominator=
            10n ** BigInt(decimal.length);

        let numerator=
            BigInt(
                whole + decimal
            );

        if(negative) {
            numerator=-numerator;
        }

        return rational(
            numerator,
            denominator
        );
    }

    return rational(
        BigInt(value),
        1n
    );
}


function rationalMultiply(a,b) {
    return rational(
        a.n*b.n,
        a.d*b.d
    );
}


function rationalDivide(a,b) {

    if(b.n===0n) {
        throw new Error(
            "Division by zero."
        );
    }

    return rational(
        a.n*b.d,
        a.d*b.n
    );
}


function rationalPower(value, exponent) {

    if(!Number.isInteger(exponent)) {
        throw new Error(
            "Exponent must be an integer."
        );
    }

    if(exponent===0) {
        return rational(1n,1n);
    }

    if(
        exponent<0 &&
        value.n===0n
    ) {
        throw new Error(
            "Zero cannot have a negative exponent."
        );
    }

    const positive=
        Math.abs(exponent);

    const n=
        value.n ** BigInt(positive);

    const d=
        value.d ** BigInt(positive);

    return exponent>0
        ? rational(n,d)
        : rational(d,n);
}


function rationalEqual(a,b) {
    return (
        a.n===b.n &&
        a.d===b.d
    );
}


function rationalToNumber(value) {
    return (
        Number(value.n) /
        Number(value.d)
    );
}


/* =========================================================
   CANONICAL MONOMIALS
   ========================================================= */

function constantMonomial(value) {
    return {
        coefficient:value,
        variables:{}
    };
}


function variableMonomial(name) {
    return {
        coefficient:
            rational(1n,1n),
        variables:{
            [name]:1
        }
    };
}


function copyVariables(variables) {
    return {
        ...variables
    };
}


function multiplyMonomials(a,b) {

    const variables=
        copyVariables(
            a.variables
        );

    for(
        const [name,exponent]
        of Object.entries(
            b.variables
        )
    ) {

        variables[name]=
            (variables[name] || 0)
            +
            exponent;

        if(variables[name]===0) {
            delete variables[name];
        }
    }

    return {
        coefficient:
            rationalMultiply(
                a.coefficient,
                b.coefficient
            ),
        variables
    };
}


function divideMonomials(a,b) {

    if(b.coefficient.n===0n) {
        throw new Error(
            "Division by zero."
        );
    }

    const variables=
        copyVariables(
            a.variables
        );

    for(
        const [name,exponent]
        of Object.entries(
            b.variables
        )
    ) {

        variables[name]=
            (variables[name] || 0)
            -
            exponent;

        if(variables[name]===0) {
            delete variables[name];
        }
    }

    return {
        coefficient:
            rationalDivide(
                a.coefficient,
                b.coefficient
            ),
        variables
    };
}


function powerMonomial(value,exponent) {

    const variables={};

    for(
        const [name,power]
        of Object.entries(
            value.variables
        )
    ) {

        const newPower=
            power*exponent;

        if(newPower!==0) {
            variables[name]=
                newPower;
        }
    }

    return {
        coefficient:
            rationalPower(
                value.coefficient,
                exponent
            ),
        variables
    };
}


function monomialEqual(a,b) {

    if(
        !rationalEqual(
            a.coefficient,
            b.coefficient
        )
    ) {
        return false;
    }

    const aKeys=
        Object.keys(
            a.variables
        ).sort();

    const bKeys=
        Object.keys(
            b.variables
        ).sort();

    if(
        aKeys.length !==
        bKeys.length
    ) {
        return false;
    }

    return aKeys.every(
        (key,index) => {
            return (
                key===bKeys[index] &&
                a.variables[key]===
                b.variables[key]
            );
        }
    );
}


/* =========================================================
   TOKENIZER / PARSER
   ========================================================= */

function tokenizeMonomialExpression(raw) {

    const text=
        latexToParserText(raw);

    const tokens=[];

    let i=0;

    while(i<text.length) {

        const ch=text[i];

        if(
            /[0-9.]/.test(ch)
        ) {

            let j=i+1;

            while(
                j<text.length &&
                /[0-9.]/.test(
                    text[j]
                )
            ) {
                j++;
            }

            const numberText=
                text.slice(i,j);

            if(
                !/^(?:\d+(?:\.\d*)?|\.\d+)$/
                .test(numberText)
            ) {
                throw new Error(
                    "Invalid number."
                );
            }

            tokens.push({
                type:"number",
                value:numberText
            });

            i=j;
            continue;
        }


        if(
            /[a-zA-Z]/.test(ch)
        ) {

            /*
               Math 9 variables are single letters.
               So ab is interpreted as a × b.
            */

            tokens.push({
                type:"variable",
                value:
                    ch.toLowerCase()
            });

            i++;
            continue;
        }


        if(
            "()+-*/^".includes(ch)
        ) {

            tokens.push({
                type:ch,
                value:ch
            });

            i++;
            continue;
        }


        throw new Error(
            `Unsupported symbol: ${ch}`
        );
    }

    return tokens;
}


function parseMonomialExpression(raw) {

    const tokens=
        tokenizeMonomialExpression(
            raw
        );

    if(tokens.length===0) {
        throw new Error(
            "Empty expression."
        );
    }

    let position=0;


    function peek() {
        return tokens[position];
    }


    function consume(type) {

        const token=peek();

        if(
            !token ||
            token.type!==type
        ) {
            throw new Error(
                `Expected ${type}.`
            );
        }

        position++;

        return token;
    }


    function beginsPrimary(token) {

        if(!token) {
            return false;
        }

        return (
            token.type==="number" ||
            token.type==="variable" ||
            token.type==="("
        );
    }


    function parsePrimary() {

        const token=peek();

        if(!token) {
            throw new Error(
                "Expected a number, variable, or bracket."
            );
        }

        if(token.type==="number") {

            position++;

            return constantMonomial(
                rationalFromString(
                    token.value
                )
            );
        }


        if(token.type==="variable") {

            position++;

            return variableMonomial(
                token.value
            );
        }


        if(token.type==="(") {

            position++;

            const value=
                parseProduct();

            consume(")");

            return value;
        }


        throw new Error(
            "Expected a number, variable, or bracket."
        );
    }


    function parseIntegerExponent() {

        let sign=1;

        if(
            peek() &&
            peek().type==="+"
        ) {
            position++;
        }

        else if(
            peek() &&
            peek().type==="-"
        ) {
            sign=-1;
            position++;
        }


        if(
            peek() &&
            peek().type==="("
        ) {

            position++;

            let innerSign=1;

            if(
                peek() &&
                peek().type==="+"
            ) {
                position++;
            }

            else if(
                peek() &&
                peek().type==="-"
            ) {
                innerSign=-1;
                position++;
            }

            const token=
                consume("number");

            if(
                !/^\d+$/.test(
                    token.value
                )
            ) {
                throw new Error(
                    "Exponent must be an integer."
                );
            }

            consume(")");

            return (
                sign *
                innerSign *
                Number(token.value)
            );
        }


        const token=
            consume("number");

        if(
            !/^\d+$/.test(
                token.value
            )
        ) {
            throw new Error(
                "Exponent must be an integer."
            );
        }

        return (
            sign *
            Number(token.value)
        );
    }


    function parsePower() {

        let value=
            parsePrimary();

        while(
            peek() &&
            peek().type==="^"
        ) {

            position++;

            const exponent=
                parseIntegerExponent();

            value=
                powerMonomial(
                    value,
                    exponent
                );
        }

        return value;
    }


    function parseUnary() {

        if(
            peek() &&
            peek().type==="+"
        ) {

            position++;

            return parseUnary();
        }


        if(
            peek() &&
            peek().type==="-"
        ) {

            position++;

            const value=
                parseUnary();

            return multiplyMonomials(
                constantMonomial(
                    rational(-1n,1n)
                ),
                value
            );
        }


        return parsePower();
    }


    function parseProduct() {

        let value=
            parseUnary();

        while(position<tokens.length) {

            const token=peek();

            if(token.type==="*") {

                position++;

                value=
                    multiplyMonomials(
                        value,
                        parseUnary()
                    );

                continue;
            }


            if(token.type==="/") {

                position++;

                value=
                    divideMonomials(
                        value,
                        parseUnary()
                    );

                continue;
            }


            /*
               Adjacent factors mean multiplication:

               12a^6
               3xy
               2(x^3)

               This is what makes ordinary algebraic typing
               feel natural for students.
            */

            if(
                beginsPrimary(token)
            ) {

                value=
                    multiplyMonomials(
                        value,
                        parseUnary()
                    );

                continue;
            }


            break;
        }

        return value;
    }


    const result=
        parseProduct();

    if(position!==tokens.length) {
        throw new Error(
            "The expression could not be fully read."
        );
    }

    return result;
}


function parseFlexibleNumeric(raw) {

    try {

        const parsed=
            parseMonomialExpression(
                raw
            );

        if(
            Object.keys(
                parsed.variables
            ).length>0
        ) {
            return NaN;
        }

        return rationalToNumber(
            parsed.coefficient
        );

    }

    catch {

        /*
           Simple decimal fallback.
        */

        const value=
            Number(
                String(raw ?? "")
                    .trim()
                    .replace(/,/g,"")
            );

        return value;
    }
}


/*
   Numeric equality helper.

   This was accidentally removed when the live-LaTeX parser
   replaced the earlier text-normalization code. Numeric questions
   such as b^7 ÷ b^7 = 1 therefore reached validate() and then
   failed when it tried to call near().

   A small tolerance is useful for decimal answers while exact
   integer answers such as 1 still compare normally.
*/
function near(a,b,tolerance=1e-9) {

    return (
        Number.isFinite(a) &&
        Number.isFinite(b) &&
        Math.abs(a-b) <= tolerance
    );
}


/* =========================================================
   REPRESENTATION REQUIREMENTS
   ========================================================= */

function escapeRegExp(text) {
    return String(text)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
}


function usesRequiredSinglePower(
    raw,
    requiredBase
) {

    let text=
        latexToParserText(
            raw
        );

    text=text
        .replace(/\s+/g,"");

    const base=
        escapeRegExp(
            requiredBase
        );

    /*
       Accepts formatting variants such as:

       3^5
       3^{5}
       3 ^ { 5 }
       (3)^5

       but does not accept an evaluated value such as 243
       when the question explicitly asks for a power of 3.
    */

    const pattern=
        new RegExp(
            "^\\(?" +
            base +
            "\\)?\\^\\(?[+-]?\\d+\\)?$"
        );

    return pattern.test(text);
}


/* =========================================================
   LIVE MATHJAX ANSWER PREVIEW
   ========================================================= */

let previewVersion=0;


function renderAnswerPreview() {

    if(!els.preview) {
        return;
    }

    const raw=
        els.input.value.trim();

    previewVersion++;

    const version=
        previewVersion;


    if(!raw) {

        els.preview.innerHTML=
            '<span class="answer-preview-placeholder">Your formatted answer will appear here.</span>';

        if(els.previewHelp) {
            els.previewHelp.textContent=
                "Type normal exponent notation such as 3^5 or LaTeX such as 3^{5}.";
        }

        return;
    }


    if(
        !window.MathJax ||
        typeof window.MathJax
            .tex2chtmlPromise !==
            "function"
    ) {

        els.preview.textContent=raw;

        return;
    }


    window.MathJax
        .tex2chtmlPromise(
            raw,
            {
                display:true
            }
        )
        .then(node => {

            /*
               Ignore an older render if the student has
               already typed something new.
            */

            if(
                version !==
                previewVersion
            ) {
                return;
            }

            els.preview.innerHTML="";

            els.preview.appendChild(
                node
            );

            if(els.previewHelp) {
                els.previewHelp.textContent=
                    "This is how your answer will be read.";
            }

        })
        .catch(() => {

            if(
                version !==
                previewVersion
            ) {
                return;
            }

            els.preview.innerHTML=
                '<span class="answer-preview-placeholder">Keep typing — the preview will appear when the LaTeX is complete.</span>';

            if(els.previewHelp) {
                els.previewHelp.textContent=
                    "Check brackets and braces if the preview does not appear.";
            }

        });
}

function qExpr(
    skill,
    instruction,
    html,
    answer,
    hint,
    steps,
    options={}
) {
    return {
        type:"expr",
        skill,
        instruction,
        html,
        answer,
        hint,
        steps,
        ...options
    };
}

function qNumeric(skill,instruction,html,answer,hint,steps) {
    return {
        type:"numeric",
        skill,
        instruction,
        html,
        answer,
        hint,
        steps
    };
}

function monomial(coef, variables) {
    let out="";

    if(coef===-1 && Object.keys(variables).length) out="-";
    else if(coef!==1 || Object.keys(variables).length===0) out=String(coef);

    Object.keys(variables).sort().forEach(v => {
        const e=variables[v];
        if(e===0) return;
        out += v;
        if(e!==1) out += `^${e}`;
    });

    return out || "1";
}

function monomialHTML(coef, variables) {
    let out="";

    if(coef===-1 && Object.keys(variables).length) out="-";
    else if(coef!==1 || Object.keys(variables).length===0) out=String(coef);

    Object.keys(variables).sort().forEach(v => {
        const e=variables[v];
        if(e===0) return;
        out += v;
        if(e!==1) out += `<sup>${e}</sup>`;
    });

    return out || "1";
}

/* =========================================================
   LESSON 2.01 — PRODUCT LAW
   ========================================================= */

function lesson201(d) {

    const modes =
        d===1
            ? ["product","product","expanded","evaluate"]
            : d===2
                ? ["product","numericProduct","missing","expanded"]
                : ["product","numericProduct","missing","threeFactor"];

    const mode=pick(modes);

    if(mode==="expanded") {
        const base=pick(["x","a","m","p"]);
        const e=ri(2,d===1?5:7);
        const expanded=Array(e).fill(base).join(" × ");

        return qExpr(
            "Index Notation",
            "Write the repeated multiplication in exponential form.",
            expanded,
            `${base}^${e}`,
            "The repeated factor is the base. Count how many times it appears.",
            [
                `The repeated factor is ${base}.`,
                `It appears ${e} times.`,
                `Answer: ${base}^${e}.`
            ]
        );
    }

    if(mode==="evaluate") {
        const base=ri(2,6);
        const e=ri(2,4);

        return qNumeric(
            "Evaluating Powers",
            "Evaluate.",
            `${base}<sup>${e}</sup>`,
            base**e,
            "Write the power as repeated multiplication.",
            [
                `${base}<sup>${e}</sup> means ${Array(e).fill(base).join(" × ")}.`,
                `Answer: ${base**e}.`
            ]
        );
    }

    if(mode==="missing") {
        const a=ri(2,8);
        const b=ri(2,8);
        const total=a+b;

        return qNumeric(
            "Product Law",
            "Find n.",
            `x<sup>${a}</sup> × x<sup>n</sup> = x<sup>${total}</sup>`,
            b,
            "For equal bases, the exponents add.",
            [
                `${a} + n = ${total}.`,
                `n = ${total} - ${a}.`,
                `n = ${b}.`
            ]
        );
    }

    if(mode==="numericProduct") {
        const base=ri(2,9);
        const m=ri(2,8);
        const n=ri(2,8);
        const e=m+n;

        return qExpr(
            "Product Law",
            "Simplify. Do not evaluate.",
            `${base}<sup>${m}</sup> × ${base}<sup>${n}</sup>`,
            `${base}^${e}`,
            "The bases match, so add the exponents.",
            [
                `The base is ${base}.`,
                `${m} + ${n} = ${e}.`,
                `Answer: ${base}^${e}.`
            ],
            {
                requiredPowerBase:base
            }
        );
    }

    if(mode==="threeFactor") {
        const v=pick(["a","b","x","y"]);
        const m=ri(1,7), n=ri(1,7), p=ri(1,7);
        const e=m+n+p;

        return qExpr(
            "Product Law",
            "Simplify.",
            `${v}<sup>${m}</sup> × ${v}<sup>${n}</sup> × ${v}<sup>${p}</sup>`,
            `${v}^${e}`,
            "Add all exponents because all three factors have the same base.",
            [
                `${m} + ${n} + ${p} = ${e}.`,
                `Answer: ${v}^${e}.`
            ]
        );
    }

    const v=pick(["a","b","x","y","m","p"]);
    const m=ri(1,d===1?6:10);
    const n=ri(1,d===1?6:10);
    let e=m+n;
    if(e===1) e++;

    return qExpr(
        "Product Law",
        "Simplify.",
        `${v}<sup>${m}</sup> × ${v}<sup>${n}</sup>`,
        `${v}^${e}`,
        "Keep the base and add the exponents.",
        [
            `The bases are both ${v}.`,
            `${m} + ${n} = ${e}.`,
            `Answer: ${v}^${e}.`
        ]
    );
}

/* =========================================================
   LESSON 2.02 — QUOTIENT LAW
   ========================================================= */

function lesson202(d) {

    const mode=pick(d===1 ? ["quotient","quotient","evaluate"] : ["quotient","evaluate","missing"]);

    if(mode==="evaluate") {
        const base=ri(2,d===3?8:5);
        const resultExp=ri(1,3);
        const den=ri(1,5);
        const num=den+resultExp;

        return qNumeric(
            "Quotient Law",
            "Simplify and evaluate.",
            `${base}<sup>${num}</sup> ÷ ${base}<sup>${den}</sup>`,
            base**resultExp,
            "Subtract the exponents first, then evaluate the remaining power.",
            [
                `${num} - ${den} = ${resultExp}.`,
                `The expression becomes ${base}<sup>${resultExp}</sup>.`,
                `Answer: ${base**resultExp}.`
            ]
        );
    }

    if(mode==="missing") {
        const den=ri(1,8);
        const result=ri(1,8);
        const num=den+result;

        return qNumeric(
            "Quotient Law",
            "Find n.",
            `x<sup>${num}</sup> ÷ x<sup>n</sup> = x<sup>${result}</sup>`,
            den,
            "For equal bases, numerator exponent minus denominator exponent gives the final exponent.",
            [
                `${num} - n = ${result}.`,
                `n = ${num} - ${result}.`,
                `n = ${den}.`
            ]
        );
    }

    const v=pick(["a","b","x","y","m","p"]);
    const n=ri(1,d===1?6:10);
    const result=ri(1,d===3?10:7);
    const m=n+result;

    return qExpr(
        "Quotient Law",
        "Simplify.",
        `${v}<sup>${m}</sup> ÷ ${v}<sup>${n}</sup>`,
        `${v}^${result}`,
        "Keep the base and subtract the exponents.",
        [
            `The bases are both ${v}.`,
            `${m} - ${n} = ${result}.`,
            `Answer: ${v}^${result}.`
        ]
    );
}

/* =========================================================
   LESSON 2.03 — COEFFICIENTS
   ========================================================= */

function lesson203(d) {

    const mode=pick(d===1 ? ["product1","quotient1"] : d===2 ? ["product1","quotient1","product2"] : ["product2","quotientNegative","product1"]);

    if(mode==="product2") {
        const c1=nonZeroInt(-8,8);
        const c2=nonZeroInt(-8,8);
        const a1=ri(1,6), a2=ri(1,6), b1=ri(1,6), b2=ri(1,6);
        const coef=c1*c2;
        const A=a1+a2, B=b1+b2;

        return qExpr(
            "Product Law with Coefficients",
            "Simplify.",
            `(${monomialHTML(c1,{a:a1,b:b1})})(${monomialHTML(c2,{a:a2,b:b2})})`,
            monomial(coef,{a:A,b:B}),
            "Multiply the coefficients. Add exponents on each matching variable.",
            [
                `${c1} × ${c2} = ${coef}.`,
                `a: ${a1} + ${a2} = ${A}.`,
                `b: ${b1} + ${b2} = ${B}.`,
                `Answer: ${monomial(coef,{a:A,b:B})}.`
            ]
        );
    }

    if(mode==="quotientNegative") {
        const v=pick(["a","b","c","d","x"]);
        const divisor=pick([2,3,4,5,6]);
        const resultCoef=pick([2,3,4,5]);
        const c1=divisor*resultCoef;
        const c2=divisor;
        const m=ri(-5,4);
        const n=ri(5,12);
        let e=m-n;
        if(e===0 || e===1) e-=2;

        return qExpr(
            "Quotient Law with Coefficients",
            "Simplify. Negative exponents are allowed.",
            `${monomialHTML(c1,{[v]:m})} ÷ ${monomialHTML(c2,{[v]:n})}`,
            monomial(resultCoef,{[v]:e}),
            "Divide the coefficients, then subtract the denominator exponent from the numerator exponent.",
            [
                `${c1} ÷ ${c2} = ${resultCoef}.`,
                `${m} - ${n} = ${e}.`,
                `Answer: ${monomial(resultCoef,{[v]:e})}.`
            ]
        );
    }

    if(mode==="quotient1") {
        const v=pick(["a","b","c","d","x"]);
        const divisor=pick([2,3,4,5,6,7]);
        const resultCoef=pick([2,3,4,5,6]);
        const c1=divisor*resultCoef;
        const c2=divisor;
        const n=ri(1,8);
        const resultExp=ri(2,8);
        const m=n+resultExp;

        return qExpr(
            "Quotient Law with Coefficients",
            "Simplify.",
            `${monomialHTML(c1,{[v]:m})} ÷ ${monomialHTML(c2,{[v]:n})}`,
            monomial(resultCoef,{[v]:resultExp}),
            "Divide the coefficients and subtract the exponents.",
            [
                `${c1} ÷ ${c2} = ${resultCoef}.`,
                `${m} - ${n} = ${resultExp}.`,
                `Answer: ${monomial(resultCoef,{[v]:resultExp})}.`
            ]
        );
    }

    const v=pick(["a","b","c","d","x"]);
    const c1=nonZeroInt(-9,9);
    const c2=nonZeroInt(-9,9);
    const m=ri(1,8), n=ri(1,8);
    const coef=c1*c2, e=m+n;

    return qExpr(
        "Product Law with Coefficients",
        "Simplify.",
        `(${monomialHTML(c1,{[v]:m})})(${monomialHTML(c2,{[v]:n})})`,
        monomial(coef,{[v]:e}),
        "Multiply the coefficients and add the exponents.",
        [
            `${c1} × ${c2} = ${coef}.`,
            `${m} + ${n} = ${e}.`,
            `Answer: ${monomial(coef,{[v]:e})}.`
        ]
    );
}

/* =========================================================
   LESSON 2.04 — POWER OF A POWER
   ========================================================= */

function lesson204(d) {

    const mode=pick(d===1 ? ["power","power"] : d===2 ? ["power","coefficient","twoVars"] : ["coefficient","twoVars","power"]);

    if(mode==="coefficient") {
        const c=pick([-4,-3,-2,2,3,4]);
        const v=pick(["x","a","b","m"]);
        const m=ri(1,5);
        const n=ri(2,3);
        const coef=c**n;
        const e=m*n;

        return qExpr(
            "Power of a Product",
            "Simplify.",
            `(${monomialHTML(c,{[v]:m})})<sup>${n}</sup>`,
            monomial(coef,{[v]:e}),
            "Raise the coefficient to the outside power and multiply the variable exponents.",
            [
                `${c}<sup>${n}</sup> = ${coef}.`,
                `${m} × ${n} = ${e}.`,
                `Answer: ${monomial(coef,{[v]:e})}.`
            ]
        );
    }

    if(mode==="twoVars") {
        const a=ri(1,5), b=ri(1,5), n=ri(2,4);

        return qExpr(
            "Power of a Product",
            "Simplify.",
            `(a<sup>${a}</sup>b<sup>${b}</sup>)<sup>${n}</sup>`,
            monomial(1,{a:a*n,b:b*n}),
            "Distribute the outside exponent to each factor and multiply exponents.",
            [
                `a: ${a} × ${n} = ${a*n}.`,
                `b: ${b} × ${n} = ${b*n}.`,
                `Answer: ${monomial(1,{a:a*n,b:b*n})}.`
            ]
        );
    }

    const v=pick(["a","b","x","y","m"]);
    const m=ri(2,d===1?5:8);
    const n=ri(2,d===3?6:5);
    const e=m*n;

    return qExpr(
        "Power of a Power",
        "Simplify.",
        `(${v}<sup>${m}</sup>)<sup>${n}</sup>`,
        `${v}^${e}`,
        "Multiply the inside exponent by the outside exponent.",
        [
            `${m} × ${n} = ${e}.`,
            `Answer: ${v}^${e}.`
        ]
    );
}

/* =========================================================
   LESSON 2.05 — POWER OF A QUOTIENT
   ========================================================= */

function lesson205(d) {

    const withCoef = d>=2 && Math.random()<0.6;

    const topVar=pick(["x","a","m"]);
    const botVar=pick(["y","b","n"]);
    const m=ri(1,4), n=ri(1,4), p=ri(2,d===3?4:3);

    if(withCoef) {
        const c=pick([2,3,4]);
        const q=pick([2,3,5]);
        const numerator = monomial(c**p,{[topVar]:m*p});
        const denominator = monomial(q**p,{[botVar]:n*p});

        return qExpr(
            "Power of a Quotient",
            "Simplify. Write your answer as numerator/denominator.",
            `(${monomialHTML(c,{[topVar]:m})}/${monomialHTML(q,{[botVar]:n})})<sup>${p}</sup>`,
            `(${numerator})/(${denominator})`,
            "Raise every factor in the numerator and denominator to the outside exponent.",
            [
                `${c}<sup>${p}</sup> = ${c**p} and ${q}<sup>${p}</sup> = ${q**p}.`,
                `${topVar}: ${m} × ${p} = ${m*p}.`,
                `${botVar}: ${n} × ${p} = ${n*p}.`,
                `Answer: ${numerator}/${denominator}.`
            ]
        );
    }

    const numerator=monomial(1,{[topVar]:m*p});
    const denominator=monomial(1,{[botVar]:n*p});

    return qExpr(
        "Power of a Quotient",
        "Simplify. Write your answer as numerator/denominator.",
        `(${topVar}<sup>${m}</sup>/${botVar}<sup>${n}</sup>)<sup>${p}</sup>`,
        `(${numerator})/(${denominator})`,
        "Multiply each variable exponent by the outside exponent.",
        [
            `${topVar}: ${m} × ${p} = ${m*p}.`,
            `${botVar}: ${n} × ${p} = ${n*p}.`,
            `Answer: ${numerator}/${denominator}.`
        ]
    );
}

/* =========================================================
   LESSON 2.06 — ZERO LAW
   ========================================================= */

function lesson206(d) {

    const modes=d===1 ? ["direct","direct","quotientZero"] : ["direct","quotientZero","mixed"];

    const mode=pick(modes);

    if(mode==="direct") {
        if(Math.random()<0.5) {
            const base=ri(2,20);

            return qNumeric(
                "Zero Exponent Law",
                "Evaluate.",
                `${base}<sup>0</sup>`,
                1,
                "Any nonzero base raised to the zero power equals 1.",
                [
                    `The exponent is 0.`,
                    `${base}<sup>0</sup> = 1.`
                ]
            );
        }

        const v=pick(["x","a","b","m"]);

        return qNumeric(
            "Zero Exponent Law",
            "Simplify.",
            `${v}<sup>0</sup>`,
            1,
            "A nonzero base raised to the zero power equals 1.",
            [
                `${v}<sup>0</sup> = 1.`
            ]
        );
    }

    if(mode==="quotientZero") {
        const v=pick(["x","a","b","m"]);
        const e=ri(2,12);

        return qNumeric(
            "Zero Exponent Law",
            "Simplify.",
            `${v}<sup>${e}</sup> ÷ ${v}<sup>${e}</sup>`,
            1,
            "Use the quotient law first. What exponent remains?",
            [
                `${e} - ${e} = 0.`,
                `The expression becomes ${v}<sup>0</sup>.`,
                `Answer: 1.`
            ]
        );
    }

    if(Math.random()<0.5) {
        const v=pick(["x","a","b"]);
        const m=ri(2,8);
        const n=ri(2,5);
        const exponent=m*n;

        return qNumeric(
            "PAT-Style Mixed Laws",
            "Simplify and evaluate.",
            `(${v}<sup>${m}</sup>)<sup>${n}</sup> ÷ ${v}<sup>${exponent}</sup>`,
            1,
            "Apply the power-of-a-power law, then the quotient law.",
            [
                `${m} × ${n} = ${exponent}.`,
                `${v}<sup>${exponent}</sup> ÷ ${v}<sup>${exponent}</sup> = ${v}<sup>0</sup>.`,
                `Answer: 1.`
            ]
        );
    }

    const base=ri(2,5);
    const m=ri(2,5);
    const n=ri(2,5);

    return qExpr(
        "PAT-Style Mixed Laws",
        "Simplify. Do not evaluate.",
        `${base}<sup>${m}</sup> × ${base}<sup>${n}</sup>`,
        `${base}^${m+n}`,
        "Use the product law because the bases match.",
        [
            `${m} + ${n} = ${m+n}.`,
            `Answer: ${base}^${m+n}.`
        ],
        {
            requiredPowerBase:base
        }
    );
}

/* =========================================================
   LESSON 2.07 — CHANGING THE BASE
   ========================================================= */

function lesson207(d) {

    const choices=[
        {base:2, value:4, inner:2},
        {base:2, value:8, inner:3},
        {base:2, value:16, inner:4},
        {base:2, value:32, inner:5},
        {base:3, value:9, inner:2},
        {base:3, value:27, inner:3},
        {base:3, value:81, inner:4},
        {base:5, value:25, inner:2},
        {base:5, value:125, inner:3}
    ];

    const c=pick(choices);
    const outer=ri(2,d===1?4:6);

    if(d===3 && Math.random()<0.55) {
        const extra=ri(1,7);

        if(Math.random()<0.5) {
            const result=c.inner*outer+extra;

            return qExpr(
                "Changing the Base",
                `Write the expression as one power with base ${c.base}.`,
                `${c.value}<sup>${outer}</sup> × ${c.base}<sup>${extra}</sup>`,
                `${c.base}^${result}`,
                `Rewrite ${c.value} as a power of ${c.base}, then use the product law.`,
                [
                    `${c.value} = ${c.base}<sup>${c.inner}</sup>.`,
                    `${c.value}<sup>${outer}</sup> = ${c.base}<sup>${c.inner*outer}</sup>.`,
                    `${c.inner*outer} + ${extra} = ${result}.`,
                    `Answer: ${c.base}^${result}.`
                ],
                {
                    requiredPowerBase:c.base
                }
            );
        }

        const transformed=c.inner*outer;
        const den=Math.min(extra, transformed-1);
        const result=transformed-den;

        return qExpr(
            "Changing the Base",
            `Write the expression as one power with base ${c.base}.`,
            `${c.value}<sup>${outer}</sup> ÷ ${c.base}<sup>${den}</sup>`,
            `${c.base}^${result}`,
            `Rewrite ${c.value} as a power of ${c.base}, then subtract exponents.`,
            [
                `${c.value}<sup>${outer}</sup> = ${c.base}<sup>${transformed}</sup>.`,
                `${transformed} - ${den} = ${result}.`,
                `Answer: ${c.base}^${result}.`
            ],
            {
                requiredPowerBase:c.base
            }
        );
    }

    const result=c.inner*outer;

    return qExpr(
        "Changing the Base",
        `Write with a base of ${c.base}.`,
        `${c.value}<sup>${outer}</sup>`,
        `${c.base}^${result}`,
        `First write ${c.value} as a power of ${c.base}.`,
        [
            `${c.value} = ${c.base}<sup>${c.inner}</sup>.`,
            `(${c.base}<sup>${c.inner}</sup>)<sup>${outer}</sup> = ${c.base}<sup>${result}</sup>.`,
            `Answer: ${c.base}^${result}.`
        ],
        {
            requiredPowerBase:c.base
        }
    );
}

/* =========================================================
   LESSON 2.08 — UNIT REVIEW
   ========================================================= */

function lesson208(d) {

    const modes = d===1
        ? ["missing","evaluate","cube"]
        : d===2
            ? ["missing","changeBaseProduct","givenPower","evaluate"]
            : ["missing","changeBaseProduct","givenPower","mixedSymbolic","cube"];

    const mode=pick(modes);

    if(mode==="missing") {
        const base=pick([2,3,5,7]);
        const a=ri(-8,8);
        const n=ri(2,15);
        const total=a+n;

        return qNumeric(
            "Review: Missing Exponent",
            "Find n.",
            `(${base}<sup>${a}</sup>)(${base}<sup>n</sup>) = ${base}<sup>${total}</sup>`,
            n,
            "Use the product law to create an equation with the exponents.",
            [
                `${a} + n = ${total}.`,
                `n = ${n}.`
            ]
        );
    }

    if(mode==="changeBaseProduct") {
        const base=pick([2,3,5]);
        const inner=pick(base===2?[2,3,4]:base===3?[2,3]:[2,3]);
        const value=base**inner;
        const a=ri(2,10), b=ri(2,6);
        const result=a+inner*b;

        return qNumeric(
            "Review: Changing the Base",
            `The expression simplifies to ${base}<sup>p</sup>. Find p.`,
            `${base}<sup>${a}</sup> × ${value}<sup>${b}</sup>`,
            result,
            `Rewrite ${value} as a power of ${base}.`,
            [
                `${value} = ${base}<sup>${inner}</sup>.`,
                `${value}<sup>${b}</sup> = ${base}<sup>${inner*b}</sup>.`,
                `${a} + ${inner*b} = ${result}.`,
                `p = ${result}.`
            ]
        );
    }

    if(mode==="givenPower") {
        const known=pick([2,3,4,5]);
        const mult=ri(2,d===3?6:5);

        return qNumeric(
            "Review: Power of a Power",
            `If a<sup>x</sup> = ${known}, find a<sup>${mult}x</sup>.`,
            `a<sup>x</sup> = ${known}`,
            known**mult,
            `Rewrite a^(${mult}x) as (a^x)^${mult}.`,
            [
                `a<sup>${mult}x</sup> = (a<sup>x</sup>)<sup>${mult}</sup>.`,
                `Substitute a<sup>x</sup> = ${known}.`,
                `${known}<sup>${mult}</sup> = ${known**mult}.`
            ]
        );
    }

    if(mode==="cube") {
        const side=ri(2,8);
        const sa=6*side*side;
        const vol=side**3;
        const diff=Math.abs(sa-vol);

        return qNumeric(
            "Review: Application",
            "Find the positive difference between the surface area and volume of the cube.",
            `<span class="small-prompt">A cube has side length ${side} units.</span>`,
            diff,
            "For a cube, surface area is 6s² and volume is s³.",
            [
                `Surface area: 6(${side}<sup>2</sup>) = ${sa}.`,
                `Volume: ${side}<sup>3</sup> = ${vol}.`,
                `Positive difference: |${sa} - ${vol}| = ${diff}.`
            ]
        );
    }

    if(mode==="mixedSymbolic") {
        const m=ri(2,6), n=ri(2,5), p=ri(2,4);
        const numeratorExp=m*n;
        const denExp=ri(1,numeratorExp-1);
        const result=numeratorExp-denExp;

        return qExpr(
            "Review: Multiple Laws",
            "Simplify.",
            `(x<sup>${m}</sup>)<sup>${n}</sup> ÷ x<sup>${denExp}</sup>`,
            `x^${result}`,
            "Use power-of-a-power first, then quotient law.",
            [
                `${m} × ${n} = ${numeratorExp}.`,
                `${numeratorExp} - ${denExp} = ${result}.`,
                `Answer: x^${result}.`
            ]
        );
    }

    const a=pick([-5,-4,-3,-2,2,3,4,5]);
    const e=ri(2,4);
    const b=pick([2,3,4]);
    const be=ri(2,3);
    const answer=(a**e)+(b**be);

    return qNumeric(
        "Review: Evaluating Powers",
        "Evaluate.",
        `(${a})<sup>${e}</sup> + ${b}<sup>${be}</sup>`,
        answer,
        "Evaluate each power before adding.",
        [
            `(${a})<sup>${e}</sup> = ${a**e}.`,
            `${b}<sup>${be}</sup> = ${b**be}.`,
            `Answer: ${answer}.`
        ]
    );
}

const generators = {
    lesson201,
    lesson202,
    lesson203,
    lesson204,
    lesson205,
    lesson206,
    lesson207,
    lesson208
};

function validate(question, raw) {

    if(question.type==="numeric") {

        const value=
            parseFlexibleNumeric(
                raw
            );

        if(!Number.isFinite(value)) {
            return {
                valid:false,
                message:
                    "Enter a numerical answer. LaTeX fractions such as \\frac{1}{2} are also accepted."
            };
        }

        return {
            valid:true,
            correct:
                near(
                    value,
                    question.answer
                )
        };
    }


    if(question.type==="expr") {

        if(
            !String(raw ?? "")
                .trim()
        ) {
            return {
                valid:false,
                message:
                    "Enter your simplified expression. You may type 3^5 or 3^{5}; both are read the same way."
            };
        }


        let entered;
        let expected;

        try {

            entered=
                parseMonomialExpression(
                    raw
                );

        }

        catch(error) {

            return {
                valid:false,
                message:
                    "I could not read that expression yet. Check the live preview, brackets, and fraction syntax."
            };
        }


        try {

            expected=
                parseMonomialExpression(
                    question.answer
                );

        }

        catch(error) {

            /*
               This should never happen for generated answers.
               Keeping a fallback prevents a broken question
               from crashing the practice page.
            */

            return {
                valid:false,
                message:
                    "This generated question could not be checked. Generate a new problem."
            };
        }


        const equivalent=
            monomialEqual(
                entered,
                expected
            );


        if(!equivalent) {
            return {
                valid:true,
                correct:false
            };
        }


        /*
           Mathematical equivalence is the main check.

           Representation restrictions are checked ONLY when
           the question explicitly requires a particular form.

           Example:
           "Write as one power with base 3."

           3^5     -> accepted
           3^{5}   -> accepted
           243     -> not accepted for that specific prompt
        */

        if(
            question.requiredPowerBase !==
            undefined
        ) {

            if(
                !usesRequiredSinglePower(
                    raw,
                    question.requiredPowerBase
                )
            ) {

                return {
                    valid:true,
                    correct:false,
                    representationMessage:
                        `Your value is equivalent, but the question asks for one power with base ${question.requiredPowerBase}.`
                };
            }

        }


        return {
            valid:true,
            correct:true
        };
    }


    return {
        valid:false,
        message:
            "Unable to check this answer."
    };
}

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
    renderMathQuestion(q);
    els.pill.textContent=difficultyNames[d];
    els.label.textContent=difficultyNames[d];

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

        els.feedback.className=
            "feedback success";

        els.feedback.textContent=
            "Correct. Nice work.";

    }

    else if(
        result.representationMessage
    ) {

        els.feedback.className=
            "feedback info";

        els.feedback.textContent=
            result.representationMessage;

    }

    else {

        els.feedback.className=
            "feedback error";

        els.feedback.textContent=
            "Not quite. Check the exponent law, try the hint, or view the worked solution.";

    }
}

function toggleHint() {

    if(!state.question) return;

    const open=els.hintBox.hidden;

    els.hintBox.hidden=!open;
    els.hint.textContent=open ? "Hide Hint" : "Hint";

    if(open) {
        els.hintBox.innerHTML=
            `<strong>Hint</strong><p>${state.question.hint}</p>`;
    }
}

function toggleSolution() {

    if(!state.question) return;

    const open=els.solutionBox.hidden;

    els.solutionBox.hidden=!open;
    els.solution.textContent=open ? "Hide Solution" : "Show Solution";

    if(open) {
        els.solutionBox.innerHTML=
            `<strong>Worked Solution</strong><ol>${
                state.question.steps.map(step => `<li>${step}</li>`).join("")
            }</ol>`;
    }
}

function renderProgress() {

    const p=state.progress;

    const accuracy=
        p.attempted
            ? Math.round((p.correct/p.attempted)*100)
            : 0;

    els.attempted.textContent=p.attempted;
    els.correct.textContent=p.correct;
    els.streak.textContent=p.streak;
    els.accuracy.textContent=`${accuracy}%`;

    els.ring.style.setProperty(
        "--progress",
        `${accuracy*3.6}deg`
    );

    els.masteryBar.style.width=
        `${Math.min(100,p.attempted*10)}%`;

    els.masteryText.textContent=
        p.attempted>=10 && accuracy>=80
            ? "Completed ✓"
            : `${Math.min(10,p.attempted)} / 10`;

    els.label.textContent=
        difficultyNames[difficulty()];
}

function resetProgress() {

    if(!confirm(`Reset saved progress for Lesson ${lessonId}?`)) {
        return;
    }

    state.progress={
        attempted:0,
        correct:0,
        streak:0
    };

    state.qnum=0;

    saveProgress();
    renderProgress();
    newQuestion();
}

els.tabs.forEach(tab => {
    tab.addEventListener("click",() => {
        setTab(tab.dataset.tab);
    });
});

els.start?.addEventListener("click",() => {
    setTab("practice");
});

els.check?.addEventListener("click",checkAnswer);

els.input?.addEventListener(
    "input",
    renderAnswerPreview
);

els.input?.addEventListener("keydown",event => {
    if(event.key==="Enter") {
        checkAnswer();
    }
});

els.hint?.addEventListener("click",toggleHint);
els.solution?.addEventListener("click",toggleSolution);
els.next?.addEventListener("click",newQuestion);
els.reset?.addEventListener("click",resetProgress);

els.quizButton?.addEventListener("click",() => {
    els.quizDialog?.showModal();
});

renderProgress();
newQuestion();

})();
