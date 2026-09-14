(() => {
"use strict";

const lessonKey = document.body.dataset.lesson;
const lessonId = document.body.dataset.lessonId;
const STORAGE_KEY = `math9-unit1-${lessonId}-progress-v2`;

const $ = (id) => document.getElementById(id);
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
    const x = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {attempted:+x?.attempted||0, correct:+x?.correct||0, streak:+x?.streak||0};
  } catch {
    return {attempted:0, correct:0, streak:0};
  }
}
function saveProgress(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
function ri(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function pick(a){ return a[ri(0,a.length-1)]; }
function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ [a,b]=[b,a%b]; } return a||1; }
function lcm(a,b){ return Math.abs(a*b)/gcd(a,b); }
function simplify(n,d){
  if(d<0){n=-n;d=-d;}
  const g=gcd(n,d);
  return {n:n/g,d:d/g};
}
function fracText(n,d){
  const s=simplify(n,d); n=s.n; d=s.d;
  if(d===1) return String(n);
  return `${n}/${d}`;
}
function mixedText(n,d){
  const s=simplify(n,d); n=s.n; d=s.d;
  const sign=n<0?"-":"";
  n=Math.abs(n);
  const whole=Math.floor(n/d), rem=n%d;
  if(rem===0) return sign+whole;
  if(whole===0) return sign+`${rem}/${d}`;
  return `${sign}${whole} ${rem}/${d}`;
}
function parseValue(raw){
  if(typeof raw!=="string") return NaN;
  let s=raw.trim().replace(/,/g,"").replace(/\$/g,"");
  if(!s) return NaN;
  const mixed=s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if(mixed){
    const w=Number(mixed[1]), n=Number(mixed[2]), d=Number(mixed[3]);
    if(!d) return NaN;
    const sign=w<0?-1:1;
    return w + sign*n/d;
  }
  const fr=s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if(fr){
    const n=Number(fr[1]), d=Number(fr[2]);
    return d ? n/d : NaN;
  }
  return Number(s);
}
function near(a,b){ return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-9; }
function difficulty(){
  const p=state.progress;
  const acc=p.attempted?p.correct/p.attempted:0;
  if(p.attempted>=7 && p.streak>=3 && acc>=0.8) return 3;
  if(p.attempted>=3 && acc>=0.6) return 2;
  return 1;
}
const dnames={1:"Foundation",2:"Standard",3:"Challenge"};

function qNumeric(skill,instruction,html,answer,hint,steps){
  return {skill,instruction,html,type:"numeric",answer,hint,steps};
}
function qString(skill,instruction,html,answer,hint,steps,normalizer=null){
  return {skill,instruction,html,type:"string",answer,hint,steps,normalizer};
}
function qSequence(skill,instruction,html,answer,hint,steps){
  return {skill,instruction,html,type:"sequence",answer,hint,steps};
}

/* ---------- Lesson 1.01 ---------- */
function lesson101(d){
  const types=d===1?["place","round","mult","dec","dec"]:["round","dec","dec","missing","money"];
  const t=pick(types);
  if(t==="place"){
    const digits=[ri(1,9),ri(0,9),ri(0,9),ri(0,9),ri(0,9)];
    const i=ri(0,4); if(digits[i]===0) digits[i]=ri(1,9);
    const p=4-i, ans=digits[i]*10**p;
    const html=digits.map((x,j)=>j===i?`<span class="highlight-digit">${x}</span>`:x).join("");
    return qNumeric("Place Value","State the value of the underlined digit.",html,ans,
      "Use the digit's position to determine its value.",
      [`The number is ${digits.join("")}.`,`The underlined digit has value ${ans}.`]);
  }
  if(t==="round"){
    const dec=pick([1,2]);
    const v=ri(1000,99999)/1000, f=10**dec, ans=Math.round(v*f)/f;
    return qNumeric("Rounding",`Round to the nearest ${dec===1?"tenth":"hundredth"}.`,String(v),ans,
      "Look one digit to the right of the place you are rounding.",
      [`Start with ${v}.`,`The rounded value is ${ans}.`]);
  }
  if(t==="mult"){
    const a=ri(2,d===1?12:99), b=ri(2,d===1?12:25);
    return qNumeric("Multiplication Review","Calculate.",`${a} × ${b}`,a*b,
      "Use a multiplication fact or written multiplication.",
      [`${a} × ${b} = ${a*b}.`]);
  }
  if(t==="money"){
    const price=ri(125,1499)/100, count=ri(8,60), ans=Math.round(price*count*100)/100;
    return qNumeric("Application","Find the total cost.",
      `<span class="small-prompt">An item costs $${price.toFixed(2)}. What is the cost of ${count} items?</span>$${price.toFixed(2)} × ${count}`,ans,
      "Multiply the price of one item by the number of items.",
      [`$${price.toFixed(2)} × ${count} = $${ans.toFixed(2)}.`]);
  }
  const aI=ri(2,d===3?999:99), bI=ri(2,d===3?499:99), ap=ri(1,d===3?3:2), bp=ri(1,d===3?3:2);
  const a=aI/10**ap, b=bI/10**bp, ans=(aI*bI)/10**(ap+bp);
  if(t==="missing"){
    return qNumeric("Decimal Placement","Insert the decimal point correctly in the product.",
      `<span class="small-prompt">${a} × ${b} has the digits ${aI*bI} in its product.</span>${aI*bI}`,ans,
      `The factors have ${ap+bp} decimal places altogether.`,
      [`${aI} × ${bI} = ${aI*bI}.`,`The product needs ${ap+bp} decimal places.`,`Answer: ${ans}.`]);
  }
  return qNumeric("Decimal Multiplication","Calculate.",`${a} × ${b}`,ans,
    "Multiply the digits first, then count the total decimal places.",
    [`Ignore decimals: ${aI} × ${bI} = ${aI*bI}.`,`Use ${ap+bp} decimal places in the product.`,`Answer: ${ans}.`]);
}

/* ---------- Lesson 1.02 ---------- */
function lesson102(d){
  if(Math.random()<0.35){
    const divisor=pick([10,100,1000]), base=ri(12,9999)/10;
    return qNumeric("Place Value Division","Calculate.",`${base} ÷ ${divisor}`,base/divisor,
      `Dividing by ${divisor} moves the digits ${String(divisor).length-1} place(s) to the right.`,
      [`${base} ÷ ${divisor} = ${base/divisor}.`]);
  }
  const divisorInt=ri(2,d===1?9:20);
  const q=ri(2,d===1?20:80);
  const dp=d===1?1:ri(1,2);
  const divisor=divisorInt/10**dp;
  const dividend=divisor*q;
  return qNumeric("Dividing Decimals","Calculate.",`${Number(dividend.toFixed(5))} ÷ ${divisor}`,q,
    "Make the divisor a whole number by moving both decimal points the same number of places.",
    [`Move both decimals ${dp} place(s) right.`,`The equivalent division has a whole-number divisor.`,`The quotient is ${q}.`]);
}

/* ---------- Lesson 1.03 ---------- */
function lesson103(d){
  const count=d===1?4:5;
  const negative=d>=2 && Math.random()<0.45;
  let vals=[];
  while(vals.length<count){
    let v=ri(1,999)/1000;
    if(negative) v=-v;
    v=Number(v.toFixed(3));
    if(!vals.includes(v)) vals.push(v);
  }
  vals=vals.sort(()=>Math.random()-0.5);
  const ascending=Math.random()<0.5;
  const ans=[...vals].sort((a,b)=>ascending?a-b:b-a);
  return qSequence("Ordering Decimals",`Arrange the numbers in ${ascending?"ascending":"descending"} order. Enter them separated by commas.`,
    vals.join(", "),ans,
    "Compare place values from left to right. Adding trailing zeros can help.",
    [`Write the decimals with matching place values if useful.`,`Correct order: ${ans.join(", ")}.`]);
}

/* ---------- Lesson 1.04 ---------- */
function lesson104(d){
  const a=ri(-20,d===1?20:50);
  const b=ri(-20,d===1?20:50);
  const subtract=Math.random()<0.5;
  const ans=subtract?a-b:a+b;
  const op=subtract?"-":"+";
  return qNumeric("Adding and Subtracting Negatives","Calculate.",`${a} ${op} (${b})`,ans,
    subtract && b<0 ? "Subtracting a negative has the same effect as adding." : "Think about movement left or right on a number line.",
    [`Rewrite the signed operation if helpful.`,`${a} ${op} (${b}) = ${ans}.`]);
}

/* ---------- Lesson 1.05 ---------- */
function lesson105(d){
  const a=ri(2,d===1?12:25), b=ri(2,d===1?12:25);
  const sa=Math.random()<0.5?-1:1, sb=Math.random()<0.5?-1:1;
  const divide=Math.random()<0.5;
  if(divide){
    const dividend=sa*sb*a*b, divisor=sb*b, ans=sa*a;
    return qNumeric("Multiplying and Dividing Integers","Calculate.",`${dividend} ÷ (${divisor})`,ans,
      "Determine the sign first: same signs are positive, different signs are negative.",
      [`Determine the sign from the two values.`,`${Math.abs(dividend)} ÷ ${Math.abs(divisor)} = ${Math.abs(ans)}.`,`Answer: ${ans}.`]);
  }
  const x=sa*a,y=sb*b,ans=x*y;
  return qNumeric("Multiplying and Dividing Integers","Calculate.",`(${x}) × (${y})`,ans,
    "Determine the sign before multiplying the magnitudes.",
    [`Determine the sign.`,`${a} × ${b} = ${a*b}.`,`Answer: ${ans}.`]);
}

/* ---------- Lesson 1.06 ---------- */
function lesson106(d){
  return pick([lesson104,lesson105])(d);
}

/* ---------- Lesson 1.07 ---------- */
function normalizeExponent(s){
  const superMap={"⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9"};
  let out=s.trim().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,m=>"^"+superMap[m]).replace(/\s+/g,"");
  out=out.replace(/\^\^/g,"^");
  return out.toLowerCase();
}
function normalizeExpanded(s){
  return s.toLowerCase().replace(/[×x·]/g,"*").replace(/\s+/g,"");
}
function lesson107(d){
  const base=ri(2,d===1?7:12), exp=ri(2,d===3?6:5);
  const mode=pick(["toexp","expanded","eval"]);
  if(mode==="toexp"){
    const shown=Array(exp).fill(base).join(" × ");
    return qString("Exponential Form","Write the repeated multiplication in exponential form.",shown,`${base}^${exp}`,
      "The repeated factor is the base; the number of factors is the exponent.",
      [`The base is ${base}.`,`There are ${exp} factors.`,`Answer: ${base}^${exp}.`],normalizeExponent);
  }
  if(mode==="expanded"){
    return qString("Exponential Form","Write the power as repeated multiplication.",`${base}<sup>${exp}</sup>`,
      Array(exp).fill(base).join("*"),
      "Repeat the base as a factor the number of times shown by the exponent.",
      [`Repeat ${base} exactly ${exp} times.`,`Answer: ${Array(exp).fill(base).join(" × ")}.`],normalizeExpanded);
  }
  return qNumeric("Evaluating Powers","Evaluate.",`${base}<sup>${exp}</sup>`,base**exp,
    "Write the power as repeated multiplication first.",
    [`${Array(exp).fill(base).join(" × ")} = ${base**exp}.`]);
}

/* ---------- Lesson 1.08 ---------- */
function lesson108(d){
  let a=ri(2,10), b=ri(2,8), c=ri(2,6), e=ri(2,3);
  if(d===1){
    const ans=a+b*c;
    return qNumeric("BEDMAS","Evaluate.",`${a} + ${b} × ${c}`,ans,
      "Multiplication is completed before addition.",
      [`${b} × ${c} = ${b*c}.`,`${a} + ${b*c} = ${ans}.`]);
  }
  if(d===2){
    const ans=(a+b)*c-b;
    return qNumeric("BEDMAS","Evaluate.",`(${a} + ${b}) × ${c} - ${b}`,ans,
      "Start inside the brackets.",
      [`${a} + ${b} = ${a+b}.`,`${a+b} × ${c} = ${(a+b)*c}.`,`Subtract ${b}: ${ans}.`]);
  }
  const ans=a+b*(c**e);
  return qNumeric("BEDMAS","Evaluate.",`${a} + ${b} × ${c}<sup>${e}</sup>`,ans,
    "Exponents come before multiplication, which comes before addition.",
    [`${c}^${e} = ${c**e}.`,`${b} × ${c**e} = ${b*(c**e)}.`,`Add ${a}: ${ans}.`]);
}

/* ---------- Lesson 1.09 ---------- */
function lesson109(d){
  const mode=d===1?pick(["square","cube"]):pick(["square","cube","estimate","bedmas"]);
  if(mode==="square"){
    const r=ri(2,15);
    return qNumeric("Square Roots","Evaluate.",`√${r*r}`,r,
      "Ask which positive integer squared gives the number under the radical.",
      [`${r}² = ${r*r}.`,`Therefore, √${r*r} = ${r}.`]);
  }
  if(mode==="cube"){
    const r=ri(2,8);
    return qNumeric("Cube Roots","Evaluate.",`∛${r**3}`,r,
      "Ask which integer cubed gives the number under the radical.",
      [`${r}³ = ${r**3}.`,`Therefore, ∛${r**3} = ${r}.`]);
  }
  if(mode==="estimate"){
    const low=ri(2,12);
    const n=ri(low*low+1,(low+1)*(low+1)-1);
    return qSequence("Estimating Square Roots","Between which two consecutive integers does the square root lie? Enter lower, upper.",`√${n}`,[low,low+1],
      "Find the perfect squares immediately below and above the radicand.",
      [`${low}² = ${low*low}.`,`${low+1}² = ${(low+1)*(low+1)}.`,`So ${low} < √${n} < ${low+1}.`]);
  }
  const r=ri(2,12), a=ri(2,8), ans=a+r;
  return qNumeric("BEDMAS with Roots","Evaluate.",`${a} + √${r*r}`,ans,
    "Evaluate the square root before addition.",
    [`√${r*r} = ${r}.`,`${a} + ${r} = ${ans}.`]);
}

/* ---------- Lesson 1.10 ---------- */
function lesson110(d){
  const mode=pick(["improper","mixed","simplify","compare"]);
  if(mode==="improper"){
    const den=ri(2,9), whole=ri(1,8), rem=ri(1,den-1), num=whole*den+rem;
    return qNumeric("Improper to Mixed","Convert to a mixed number.",`${num}/${den}`,num/den,
      "Divide the numerator by the denominator. The remainder becomes the new numerator.",
      [`${num} ÷ ${den} = ${whole} remainder ${rem}.`,`Answer: ${whole} ${rem}/${den}.`]);
  }
  if(mode==="mixed"){
    const den=ri(2,9), whole=ri(1,8), rem=ri(1,den-1), num=whole*den+rem;
    return qNumeric("Mixed to Improper","Convert to an improper fraction.",`${whole} ${rem}/${den}`,num/den,
      "Multiply the whole number by the denominator, then add the numerator.",
      [`${whole} × ${den} + ${rem} = ${num}.`,`Answer: ${num}/${den}.`]);
  }
  if(mode==="simplify"){
    const n=ri(2,12), d0=ri(n+1,18), f=ri(2,6), s=simplify(n,d0);
    return qNumeric("Simplifying Fractions","Write in lowest terms.",`${n*f}/${d0*f}`,s.n/s.d,
      "Divide the numerator and denominator by a common factor.",
      [`${n*f}/${d0*f} simplifies to ${s.n}/${s.d}.`]);
  }
  let aN=ri(1,9),aD=ri(aN+1,12),bN=ri(1,9),bD=ri(bN+1,12);
  if(d>=2 && Math.random()<0.4) aN=-aN;
  if(d>=2 && Math.random()<0.4) bN=-bN;
  const av=aN/aD,bv=bN/bD,ans=av>bv?">":av<bv?"<":"=";
  return qString("Comparing Rational Numbers","Enter >, <, or =.",`${aN}/${aD} &nbsp; ? &nbsp; ${bN}/${bD}`,ans,
    "Use a common denominator or convert to decimals.",
    [`${aN}/${aD} ${ans} ${bN}/${bD}.`],s=>s.trim());
}

/* ---------- Fraction operation helpers ---------- */
function fracPair(d){
  const aD=ri(2,d===1?10:15), bD=ri(2,d===1?10:15);
  let aN=ri(1,aD-1), bN=ri(1,bD-1);
  if(d===3 && Math.random()<0.35) aN=-aN;
  if(d===3 && Math.random()<0.35) bN=-bN;
  return {aN,aD,bN,bD};
}
function lesson111(d){
  const {aN,aD,bN,bD}=fracPair(d);
  const L=lcm(aD,bD), n=aN*(L/aD)+bN*(L/bD), s=simplify(n,L);
  return qNumeric("Adding Rational Numbers","Add and simplify.",`${aN}/${aD} + ${bN}/${bD}`,s.n/s.d,
    "Find a common denominator before adding the numerators.",
    [`A common denominator is ${L}.`,`The sum is ${n}/${L}.`,`Simplified answer: ${mixedText(s.n,s.d)}.`]);
}
function lesson112(d){
  const {aN,aD,bN,bD}=fracPair(d);
  const L=lcm(aD,bD), n=aN*(L/aD)-bN*(L/bD), s=simplify(n,L);
  return qNumeric("Subtracting Rational Numbers","Subtract and simplify.",`${aN}/${aD} - ${bN}/${bD}`,s.n/s.d,
    "Find a common denominator before subtracting the numerators.",
    [`A common denominator is ${L}.`,`The difference is ${n}/${L}.`,`Simplified answer: ${mixedText(s.n,s.d)}.`]);
}
function lesson113(d){
  let {aN,aD,bN,bD}=fracPair(d);
  if(d>=2 && Math.random()<0.45){
    aN=ri(aD+1,aD*4); bN=ri(bD+1,bD*3);
  }
  const s=simplify(aN*bN,aD*bD);
  return qNumeric("Multiplying Rational Numbers","Multiply and simplify.",`${aN}/${aD} × ${bN}/${bD}`,s.n/s.d,
    "Multiply numerator by numerator and denominator by denominator. No common denominator is needed.",
    [`Multiply: ${(aN*bN)}/${(aD*bD)}.`,`Simplified answer: ${mixedText(s.n,s.d)}.`]);
}
function lesson114(d){
  let {aN,aD,bN,bD}=fracPair(d);
  if(bN===0) bN=1;
  if(d>=2 && Math.random()<0.45){
    aN=ri(aD+1,aD*4);
  }
  const s=simplify(aN*bD,aD*bN);
  return qNumeric("Dividing Rational Numbers","Divide and simplify.",`${aN}/${aD} ÷ ${bN}/${bD}`,s.n/s.d,
    "Keep the first fraction, change ÷ to ×, and use the reciprocal of the second fraction.",
    [`${aN}/${aD} × ${bD}/${bN}.`,`Multiply to get ${(aN*bD)}/${(aD*bN)}.`,`Simplified answer: ${mixedText(s.n,s.d)}.`]);
}

const generators={lesson101,lesson102,lesson103,lesson104,lesson105,lesson106,lesson107,lesson108,lesson109,lesson110,lesson111,lesson112,lesson113,lesson114};

function validate(q,raw){
  if(q.type==="numeric"){
    const v=parseValue(raw);
    if(!Number.isFinite(v)) return {valid:false,message:"Enter a number, decimal, fraction, or mixed number."};
    return {valid:true,correct:near(v,q.answer)};
  }
  if(q.type==="string"){
    const norm=q.normalizer||((s)=>s.trim().toLowerCase());
    return {valid:true,correct:norm(raw)===norm(q.answer)};
  }
  if(q.type==="sequence"){
    const parts=raw.split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
    if(parts.length!==q.answer.length) return {valid:false,message:`Enter ${q.answer.length} values separated by commas.`};
    const vals=parts.map(parseValue);
    if(vals.some(v=>!Number.isFinite(v))) return {valid:false,message:"Make sure every entry is a valid number or fraction."};
    return {valid:true,correct:vals.every((v,i)=>near(v,q.answer[i]))};
  }
  return {valid:false,message:"Unable to check this answer."};
}

function setTab(name){
  els.tabs.forEach(t=>{
    const active=t.dataset.tab===name;
    t.classList.toggle("active",active);
    t.setAttribute("aria-selected",String(active));
  });
  els.panels.forEach(p=>p.classList.toggle("active",p.id===name));
  if(name==="practice") setTimeout(()=>els.input.focus(),50);
}
function newQuestion(){
  const gen=generators[lessonKey];
  if(!gen) return;
  state.qnum++;
  state.question={...gen(difficulty()),difficulty:difficulty()};
  state.counted=false;
  const q=state.question;
  els.skill.textContent=q.skill;
  els.number.textContent=state.qnum;
  els.instruction.textContent=q.instruction;
  els.problem.innerHTML=q.html;
  els.pill.textContent=dnames[q.difficulty];
  els.label.textContent=dnames[q.difficulty];
  els.input.value="";
  els.feedback.className="feedback";
  els.feedback.textContent="";
  els.hintBox.hidden=true;
  els.solutionBox.hidden=true;
  els.hint.textContent="Hint";
  els.solution.textContent="Show Solution";
  els.input.focus();
}
function check(){
  const q=state.question;
  if(!q) return;
  const result=validate(q,els.input.value);
  if(!result.valid){
    els.feedback.className="feedback info";
    els.feedback.textContent=result.message;
    return;
  }
  if(!state.counted){
    state.progress.attempted++;
    if(result.correct){ state.progress.correct++; state.progress.streak++; }
    else state.progress.streak=0;
    state.counted=true;
    saveProgress();
    renderProgress();
  }
  if(result.correct){
    els.feedback.className="feedback success";
    els.feedback.textContent="Correct. Nice work.";
  }else{
    els.feedback.className="feedback error";
    els.feedback.textContent="Not quite. Try again, use the hint, or view the worked solution.";
  }
}
function toggleHint(){
  if(!state.question) return;
  const open=els.hintBox.hidden;
  els.hintBox.hidden=!open;
  els.hint.textContent=open?"Hide Hint":"Hint";
  if(open) els.hintBox.innerHTML=`<strong>Hint</strong><p>${state.question.hint}</p>`;
}
function toggleSolution(){
  if(!state.question) return;
  const open=els.solutionBox.hidden;
  els.solutionBox.hidden=!open;
  els.solution.textContent=open?"Hide Solution":"Show Solution";
  if(open) els.solutionBox.innerHTML=`<strong>Worked Solution</strong><ol>${state.question.steps.map(x=>`<li>${x}</li>`).join("")}</ol>`;
}
function renderProgress(){
  const p=state.progress, acc=p.attempted?Math.round(p.correct/p.attempted*100):0;
  els.attempted.textContent=p.attempted;
  els.correct.textContent=p.correct;
  els.streak.textContent=p.streak;
  els.accuracy.textContent=`${acc}%`;
  els.ring.style.setProperty("--progress",`${acc*3.6}deg`);
  els.masteryBar.style.width=`${Math.min(100,p.attempted*10)}%`;
  els.masteryText.textContent=p.attempted>=10&&acc>=80?"Completed ✓":`${Math.min(10,p.attempted)} / 10`;
  els.label.textContent=dnames[difficulty()];
}
function reset(){
  if(!confirm(`Reset saved progress for Lesson ${lessonId}?`)) return;
  state.progress={attempted:0,correct:0,streak:0};
  state.qnum=0;
  saveProgress(); renderProgress(); newQuestion();
}

els.tabs.forEach(t=>t.addEventListener("click",()=>setTab(t.dataset.tab)));
els.start?.addEventListener("click",()=>{setTab("practice"); if(!state.question)newQuestion();});
els.check?.addEventListener("click",check);
els.input?.addEventListener("keydown",e=>{if(e.key==="Enter")check();});
els.hint?.addEventListener("click",toggleHint);
els.solution?.addEventListener("click",toggleSolution);
els.next?.addEventListener("click",newQuestion);
els.reset?.addEventListener("click",reset);
els.quizButton?.addEventListener("click",()=>els.quizDialog?.showModal());

renderProgress();
newQuestion();
})();
