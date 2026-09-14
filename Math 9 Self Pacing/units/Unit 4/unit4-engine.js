(() => {
"use strict";

const lessonKey = document.body.dataset.lesson;
const lessonId = document.body.dataset.lessonId;
const STORAGE_KEY = `math9-unit4-${lessonId}-progress-v2`;

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

function ri(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pick(array) {
    return array[ri(0, array.length - 1)];
}

function nonZeroInt(min, max) {
    let value = 0;
    while (value === 0) value = ri(min, max);
    return value;
}

function round(value, places = 1) {
    const p = 10 ** places;
    return Math.round((value + Number.EPSILON) * p) / p;
}

function difficulty() {
    const p = state.progress;
    const accuracy = p.attempted ? p.correct / p.attempted : 0;

    if (p.attempted >= 7 && p.streak >= 3 && accuracy >= 0.8) return 3;
    if (p.attempted >= 3 && accuracy >= 0.6) return 2;
    return 1;
}

const difficultyNames = {
    1: "Foundation",
    2: "Standard",
    3: "Challenge"
};

/* =========================================================
   SVG DIAGRAM HELPERS
   ========================================================= */

function svgWrap(content, viewBox = "0 0 600 300") {
    return `<div class="geometry-diagram">
        <svg viewBox="${viewBox}" role="img" aria-label="Generated geometry diagram">
            ${content}
        </svg>
    </div>`;
}

function parallelDiagram(angle, relation) {
    let target = relation === "corresponding"
        ? {x: 390, y: 205}
        : relation === "alternate"
            ? {x: 335, y: 180}
            : {x: 390, y: 180};

    return svgWrap(`
        <line x1="80" y1="85" x2="520" y2="85" class="diagram-line"/>
        <line x1="80" y1="215" x2="520" y2="215" class="diagram-line"/>
        <line x1="220" y1="25" x2="380" y2="275" class="diagram-line"/>
        <text x="250" y="70" class="diagram-label">${angle}°</text>
        <text x="${target.x}" y="${target.y}" class="diagram-label">x</text>
        <text x="88" y="72" class="diagram-subtle-label">parallel</text>
        <text x="88" y="202" class="diagram-subtle-label">parallel</text>
    `);
}

function crossingDiagram(angle) {
    return svgWrap(`
        <line x1="100" y1="250" x2="500" y2="50" class="diagram-line"/>
        <line x1="100" y1="50" x2="500" y2="250" class="diagram-line"/>
        <text x="345" y="155" class="diagram-label">${angle}°</text>
        <text x="225" y="155" class="diagram-label">x</text>
    `);
}

function pointAnglesDiagram(angles) {
    const positions = [
        [315, 110], [355, 170], [260, 230], [190, 150]
    ];
    const labels = [
        `${angles[0]}°`, `${angles[1]}°`, `${angles[2]}°`, "x"
    ];
    const rays = [
        [300,150,300,30],
        [300,150,440,130],
        [300,150,350,260],
        [300,150,160,235],
        [300,150,170,85]
    ];
    return svgWrap(`
        ${rays.map(([x1,y1,x2,y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="diagram-line"/>`).join("")}
        <circle cx="300" cy="150" r="4" fill="#14213d"/>
        ${labels.map((lab, i) => `<text x="${positions[i][0]}" y="${positions[i][1]}" class="diagram-label">${lab}</text>`).join("")}
    `);
}

function triangleDiagram(a, b, xLabel = "x") {
    return svgWrap(`
        <polygon points="300,35 115,250 500,250" class="diagram-shape"/>
        <text x="285" y="85" class="diagram-label">${a}°</text>
        <text x="145" y="235" class="diagram-label">${b}°</text>
        <text x="445" y="235" class="diagram-label">${xLabel}</text>
    `);
}

function exteriorTriangleDiagram(a, b) {
    return svgWrap(`
        <polygon points="275,45 115,235 440,235" class="diagram-shape"/>
        <line x1="440" y1="235" x2="545" y2="235" class="diagram-line"/>
        <text x="260" y="88" class="diagram-label">${a}°</text>
        <text x="140" y="220" class="diagram-label">${b}°</text>
        <text x="460" y="218" class="diagram-label">x</text>
    `);
}

function triangleBySidesDiagram(type, sides) {
    let points, marks = "";
    if (type === "equilateral") {
        points = "300,45 145,245 455,245";
        marks = `
            <line x1="210" y1="135" x2="222" y2="145" class="diagram-line"/>
            <line x1="388" y1="135" x2="376" y2="145" class="diagram-line"/>
            <line x1="300" y1="245" x2="300" y2="228" class="diagram-line"/>
        `;
    } else if (type === "isosceles") {
        points = "300,50 165,245 450,245";
        marks = `
            <line x1="225" y1="150" x2="237" y2="160" class="diagram-line"/>
            <line x1="375" y1="150" x2="363" y2="160" class="diagram-line"/>
        `;
    } else {
        points = "300,55 120,225 470,245";
    }
    return svgWrap(`
        <polygon points="${points}" class="diagram-shape"/>
        ${marks}
        <text x="210" y="140" class="diagram-subtle-label">${sides[0]} cm</text>
        <text x="365" y="150" class="diagram-subtle-label">${sides[1]} cm</text>
        <text x="275" y="270" class="diagram-subtle-label">${sides[2]} cm</text>
    `);
}

function triangleByAnglesDiagram(type, angles) {
    let points = type === "obtuse" ? "120,220 470,245 250,60" :
                 type === "right" ? "160,245 160,85 440,245" :
                 "300,45 145,245 455,245";

    const rightMarker = type === "right"
        ? `<path d="M160 220 L185 220 L185 245" class="diagram-thin" stroke="#2f6feb" stroke-width="4"/>`
        : "";

    return svgWrap(`
        <polygon points="${points}" class="diagram-shape"/>
        ${rightMarker}
        <text x="275" y="105" class="diagram-label">${angles[0]}°</text>
        <text x="155" y="225" class="diagram-label">${angles[1]}°</text>
        <text x="410" y="230" class="diagram-label">${angles[2]}°</text>
    `);
}

function congruentPolygonsDiagram(side) {
    return svgWrap(`
        <polygon points="110,115 170,60 245,95 220,175 140,190" class="diagram-shape"/>
        <polygon points="360,95 430,50 505,88 480,178 390,195" class="diagram-highlight"/>
        <text x="120" y="220" class="diagram-subtle-label">congruent</text>
        <text x="385" y="220" class="diagram-subtle-label">congruent</text>
        <text x="190" y="78" class="diagram-label">${side} cm</text>
        <text x="445" y="68" class="diagram-label">x cm</text>
    `);
}

function congruentAnglesDiagram(angle) {
    return svgWrap(`
        <polygon points="135,200 220,70 295,215" class="diagram-shape"/>
        <polygon points="360,200 445,70 520,215" class="diagram-highlight"/>
        <path d="M198 180 A35 35 0 0 1 225 148" fill="none" stroke="#2f6feb" stroke-width="4"/>
        <path d="M423 180 A35 35 0 0 1 450 148" fill="none" stroke="#2f6feb" stroke-width="4"/>
        <text x="205" y="135" class="diagram-label">${angle}°</text>
        <text x="430" y="135" class="diagram-label">x</text>
        <text x="150" y="240" class="diagram-subtle-label">congruent</text>
        <text x="380" y="240" class="diagram-subtle-label">congruent</text>
    `);
}

function rectangleSimilarityDiagram(s1a, s1b, s2a, s2bLabel) {
    return svgWrap(`
        <rect x="80" y="85" width="150" height="90" class="diagram-shape"/>
        <rect x="320" y="55" width="220" height="132" class="diagram-highlight"/>
        <text x="130" y="205" class="diagram-label">${s1a}</text>
        <text x="40" y="135" class="diagram-label">${s1b}</text>
        <text x="405" y="220" class="diagram-label">${s2a}</text>
        <text x="545" y="125" class="diagram-label">${s2bLabel}</text>
    `);
}

function circleDiagram(radius, label = "r") {
    return svgWrap(`
        <circle cx="300" cy="150" r="95" class="diagram-shape"/>
        <line x1="300" y1="150" x2="395" y2="150" class="diagram-line"/>
        <circle cx="300" cy="150" r="4" fill="#14213d"/>
        <text x="337" y="135" class="diagram-label">${label} = ${radius}</text>
    `);
}

function compositeCutDiagram(w, h, cw, ch) {
    const tipY = 55 + ch * 14;
    const tipX = 460 - cw * 14;
    return svgWrap(`
        <rect x="100" y="55" width="360" height="190" class="diagram-shape"/>
        <polygon points="460,55 460,${tipY} ${tipX},55" fill="white" stroke="#14213d" stroke-width="3"/>
        <text x="260" y="275" class="diagram-label">${w} cm</text>
        <text x="42" y="155" class="diagram-label">${h} cm</text>
        <text x="${tipX + 22}" y="42" class="diagram-subtle-label">${cw} cm</text>
        <text x="470" y="${(55 + tipY)/2}" class="diagram-subtle-label">${ch} cm</text>
    `);
}

function lShapeDiagram(a, b, c, d) {
    return svgWrap(`
        <path d="M110 235 L110 75 L270 75 L270 145 L410 145 L410 235 Z" class="diagram-shape"/>
        <line x1="110" y1="75" x2="270" y2="75" class="diagram-thin"/>
        <line x1="270" y1="145" x2="410" y2="145" class="diagram-thin"/>
        <text x="160" y="62" class="diagram-label">${a} cm</text>
        <text x="305" y="132" class="diagram-label">${c} cm</text>
        <text x="68" y="165" class="diagram-label">${b} cm</text>
        <text x="422" y="200" class="diagram-label">${d} cm</text>
    `);
}

function rectangleAreaDiagram(l, w) {
    return svgWrap(`
        <rect x="140" y="70" width="320" height="170" class="diagram-shape"/>
        <text x="275" y="265" class="diagram-label">${l} cm</text>
        <text x="55" y="165" class="diagram-label">${w} cm</text>
    `);
}

function triangleAreaDiagram(b, h) {
    return svgWrap(`
        <polygon points="120,235 490,235 260,60" class="diagram-shape"/>
        <line x1="260" y1="60" x2="260" y2="235" class="diagram-thin" stroke-dasharray="7 7"/>
        <text x="275" y="148" class="diagram-label">${h} cm</text>
        <text x="270" y="270" class="diagram-label">${b} cm</text>
    `);
}

function squareAreaDiagram(area) {
    return svgWrap(`
        <rect x="175" y="55" width="250" height="190" class="diagram-shape"/>
        <text x="245" y="160" class="diagram-label">A = ${area} cm²</text>
    `);
}

function cuboidDiagram(l, w, h) {
    return svgWrap(`
        <polygon points="155,110 385,110 470,55 240,55" class="diagram-shape"/>
        <polygon points="155,110 385,110 385,235 155,235" class="diagram-highlight"/>
        <polygon points="385,110 470,55 470,180 385,235" class="diagram-shape"/>
        <text x="250" y="265" class="diagram-label">${l}</text>
        <text x="105" y="180" class="diagram-label">${h}</text>
        <text x="420" y="78" class="diagram-label">${w}</text>
    `);
}

function triangularPrismDiagram(a, b, c, length) {
    return svgWrap(`
        <polygon points="150,210 150,110 280,210" class="diagram-shape"/>
        <polygon points="325,210 325,110 455,210" class="diagram-highlight"/>
        <line x1="150" y1="110" x2="325" y2="110" class="diagram-line"/>
        <line x1="150" y1="210" x2="325" y2="210" class="diagram-line"/>
        <line x1="280" y1="210" x2="455" y2="210" class="diagram-line"/>
        <text x="135" y="165" class="diagram-label">${a}</text>
        <text x="208" y="230" class="diagram-label">${b}</text>
        <text x="205" y="150" class="diagram-label">${c}</text>
        <text x="370" y="98" class="diagram-label">${length}</text>
    `);
}

function crossSectionPrismDiagram(area, perimeter, length) {
    return svgWrap(`
        <polygon points="120,185 180,85 275,85 330,165 245,235" class="diagram-shape"/>
        <polygon points="300,185 360,85 455,85 510,165 425,235" class="diagram-highlight"/>
        <line x1="120" y1="185" x2="300" y2="185" class="diagram-line"/>
        <line x1="180" y1="85" x2="360" y2="85" class="diagram-line"/>
        <line x1="275" y1="85" x2="455" y2="85" class="diagram-line"/>
        <line x1="330" y1="165" x2="510" y2="165" class="diagram-line"/>
        <line x1="245" y1="235" x2="425" y2="235" class="diagram-line"/>
        <text x="110" y="45" class="diagram-label">A = ${area} cm²</text>
        <text x="330" y="45" class="diagram-label">length = ${length} cm</text>
        <text x="160" y="270" class="diagram-label">P = ${perimeter} cm</text>
    `);
}

function cylinderDiagram(r, h, openTop = false) {
    return svgWrap(`
        <ellipse cx="300" cy="70" rx="105" ry="35" class="diagram-shape"/>
        <line x1="195" y1="70" x2="195" y2="230" class="diagram-line"/>
        <line x1="405" y1="70" x2="405" y2="230" class="diagram-line"/>
        <ellipse cx="300" cy="230" rx="105" ry="35" class="diagram-shape"/>
        ${openTop ? '<ellipse cx="300" cy="70" rx="85" ry="25" fill="white" stroke="#2f6feb" stroke-width="3" stroke-dasharray="8 7"/>' : ''}
        <line x1="300" y1="70" x2="${300 + 105}" y2="70" class="diagram-line"/>
        <text x="337" y="55" class="diagram-label">r = ${r}</text>
        <text x="420" y="160" class="diagram-label">h = ${h}</text>
    `);
}

function coordinateGrid(point, imagePoint = null) {
    const scale = 28;
    const ox = 300;
    const oy = 150;

    let grid = "";
    for (let i = -8; i <= 8; i++) {
        const x = ox + i * scale;
        grid += `<line x1="${x}" y1="20" x2="${x}" y2="280" class="diagram-thin"/>`;
    }
    for (let j = -4; j <= 4; j++) {
        const y = oy - j * scale;
        grid += `<line x1="70" y1="${y}" x2="530" y2="${y}" class="diagram-thin"/>`;
    }

    const px = ox + point[0] * scale;
    const py = oy - point[1] * scale;

    let extra = `
        <circle cx="${px}" cy="${py}" r="7" fill="#2f6feb"/>
        <text x="${px + 10}" y="${py - 10}" class="diagram-label">A</text>
    `;

    if (imagePoint) {
        const ix = ox + imagePoint[0] * scale;
        const iy = oy - imagePoint[1] * scale;
        extra += `
            <circle cx="${ix}" cy="${iy}" r="7" fill="#16a34a"/>
            <text x="${ix + 10}" y="${iy - 10}" class="diagram-label">A′</text>
        `;
    }

    return svgWrap(`
        ${grid}
        <line x1="70" y1="${oy}" x2="530" y2="${oy}" class="diagram-line"/>
        <line x1="${ox}" y1="20" x2="${ox}" y2="280" class="diagram-line"/>
        ${extra}
    `);
}

function squareSymmetryDiagram(shape) {
    let content = "";
    if (shape === "square") {
        content = `
            <rect x="185" y="55" width="230" height="190" class="diagram-shape"/>
            <line x1="300" y1="55" x2="300" y2="245" class="diagram-thin" stroke="#2f6feb"/>
            <line x1="185" y1="150" x2="415" y2="150" class="diagram-thin" stroke="#2f6feb"/>
            <line x1="185" y1="55" x2="415" y2="245" class="diagram-thin" stroke="#2f6feb"/>
            <line x1="415" y1="55" x2="185" y2="245" class="diagram-thin" stroke="#2f6feb"/>
        `;
    } else if (shape === "rectangle") {
        content = `
            <rect x="145" y="85" width="310" height="140" class="diagram-shape"/>
            <line x1="300" y1="85" x2="300" y2="225" class="diagram-thin" stroke="#2f6feb"/>
            <line x1="145" y1="155" x2="455" y2="155" class="diagram-thin" stroke="#2f6feb"/>
        `;
    } else if (shape === "rhombus") {
        content = `
            <polygon points="300,40 430,150 300,260 170,150" class="diagram-shape"/>
            <line x1="300" y1="40" x2="300" y2="260" class="diagram-thin" stroke="#2f6feb"/>
            <line x1="170" y1="150" x2="430" y2="150" class="diagram-thin" stroke="#2f6feb"/>
        `;
    } else if (shape === "parallelogram") {
        content = `<polygon points="180,230 410,230 350,80 120,80" class="diagram-shape"/>`;
    } else if (shape === "kite") {
        content = `
            <polygon points="300,40 400,160 300,255 235,160" class="diagram-shape"/>
            <line x1="300" y1="40" x2="300" y2="255" class="diagram-thin" stroke="#2f6feb"/>
        `;
    } else if (shape === "isosceles trapezoid") {
        content = `
            <polygon points="170,220 430,220 360,90 240,90" class="diagram-shape"/>
            <line x1="300" y1="90" x2="300" y2="220" class="diagram-thin" stroke="#2f6feb"/>
        `;
    } else {
        content = `<polygon points="155,210 435,235 375,85 220,65" class="diagram-shape"/>`;
    }
    return svgWrap(content);
}

function rotationOrderDiagram(shape) {
    let content = '';
    if (shape === "square") {
        content = `
            <rect x="205" y="70" width="190" height="190" class="diagram-shape"/>
            <circle cx="300" cy="165" r="55" fill="none" stroke="#2f6feb" stroke-width="3" stroke-dasharray="6 8"/>
            <path d="M355 160 L372 165 L360 177" fill="none" stroke="#2f6feb" stroke-width="3"/>
        `;
    } else if (shape === "rectangle") {
        content = `<rect x="160" y="95" width="280" height="140" class="diagram-shape"/>`;
    } else if (shape === "rhombus") {
        content = `<polygon points="300,50 425,165 300,280 175,165" class="diagram-shape"/>`;
    } else if (shape === "parallelogram") {
        content = `<polygon points="180,235 430,235 360,85 110,85" class="diagram-shape"/>`;
    } else if (shape === "kite") {
        content = `<polygon points="300,40 385,165 300,255 240,165" class="diagram-shape"/>`;
    } else if (shape === "isosceles trapezoid") {
        content = `<polygon points="170,225 430,225 355,90 245,90" class="diagram-shape"/>`;
    } else {
        content = `<polygon points="155,210 435,235 375,85 220,65" class="diagram-shape"/>`;
    }

    return svgWrap(`
        ${content}
        <circle cx="300" cy="155" r="5" fill="#14213d"/>
        <path d="M300 78 A77 77 0 0 1 372 130" fill="none" stroke="#2f6feb" stroke-width="3"/>
        <path d="M367 115 L383 124 L372 138" fill="none" stroke="#2f6feb" stroke-width="3"/>
    `);
}

function scaleBarDiagram(drawingUnit, actualMetres, drawingLength) {
    return svgWrap(`
        <rect x="90" y="90" width="${drawingUnit * 40}" height="32" class="diagram-highlight"/>
        <text x="90" y="78" class="diagram-label">${drawingUnit} cm on drawing</text>
        <rect x="90" y="175" width="${drawingLength * 18}" height="32" class="diagram-shape"/>
        <text x="90" y="165" class="diagram-label">${drawingLength} cm measured</text>
        <text x="330" y="112" class="diagram-subtle-label">represents ${actualMetres} m actual</text>
    `);
}

function mapScaleDiagram(r, mapCm) {
    return svgWrap(`
        <rect x="90" y="60" width="420" height="180" rx="18" ry="18" class="diagram-shape"/>
        <line x1="150" y1="150" x2="410" y2="150" class="diagram-line"/>
        <circle cx="150" cy="150" r="10" fill="#2f6feb"/>
        <circle cx="410" cy="150" r="10" fill="#16a34a"/>
        <text x="120" y="190" class="diagram-label">A</text>
        <text x="405" y="190" class="diagram-label">B</text>
        <text x="235" y="138" class="diagram-label">${mapCm} cm on map</text>
        <text x="120" y="95" class="diagram-subtle-label">scale 1:${r.toLocaleString()}</text>
    `);
}

/* =========================================================
   QUESTION FACTORIES
   ========================================================= */

function qNumeric(skill, instruction, prompt, answer, hint, steps, options = {}) {
    return {
        type: "numeric",
        previewMode: "math",
        skill,
        instruction,
        prompt,
        answer,
        hint,
        steps,
        ...options
    };
}

function qText(skill, instruction, prompt, answers, hint, steps, options = {}) {
    return {
        type: "text",
        previewMode: "text",
        skill,
        instruction,
        prompt,
        answers,
        hint,
        steps,
        ...options
    };
}

function qPair(skill, instruction, prompt, answer, hint, steps, options = {}) {
    return {
        type: "pair",
        previewMode: "math",
        skill,
        instruction,
        prompt,
        answer,
        hint,
        steps,
        ...options
    };
}

/* =========================================================
   4.01 ANGLES IN PARALLEL LINES
   ========================================================= */

function lesson401(d) {
    const modes = d === 1
        ? ["straight", "vertical", "corresponding"]
        : d === 2
            ? ["vertical", "corresponding", "alternate", "cointerior"]
            : ["corresponding", "alternate", "cointerior", "aroundPoint"];

    const mode = pick(modes);

    if (mode === "straight") {
        const a = ri(25, 155);
        return qNumeric(
            "Angles on a Straight Line",
            "Find x in degrees.",
            `Two adjacent angles form a straight line.`,
            180 - a,
            "Angles on a straight line add to 180°.",
            [
                `x + ${a} = 180.`,
                `x = 180 - ${a}.`,
                `x = ${180 - a}°.`
            ],
            { diagram: svgWrap(`
                <line x1="90" y1="180" x2="510" y2="180" class="diagram-line"/>
                <line x1="300" y1="180" x2="400" y2="90" class="diagram-line"/>
                <text x="210" y="155" class="diagram-label">${a}°</text>
                <text x="350" y="145" class="diagram-label">x</text>
            `)}
        );
    }

    if (mode === "vertical") {
        const a = ri(25, 155);
        return qNumeric(
            "Vertically Opposite Angles",
            "Find x in degrees.",
            `The diagram shows two intersecting lines. Find x.`,
            a,
            "Vertically opposite angles are equal.",
            [
                `x is vertically opposite the ${a}° angle.`,
                `Therefore x = ${a}°.`
            ],
            { diagram: crossingDiagram(a) }
        );
    }

    if (mode === "corresponding" || mode === "alternate") {
        const a = ri(30, 150);
        const name = mode === "corresponding" ? "Corresponding Angles" : "Alternate Angles";
        return qNumeric(
            name,
            "Find x in degrees.",
            `The two horizontal lines are parallel. Use ${mode} angles.`,
            a,
            `${name} are equal when the lines are parallel.`,
            [
                `The marked angles are ${mode}.`,
                `Therefore x = ${a}°.`
            ],
            { diagram: parallelDiagram(a, mode) }
        );
    }

    if (mode === "cointerior") {
        const a = ri(35, 145);
        return qNumeric(
            "Co-interior Angles",
            "Find x in degrees.",
            `The two horizontal lines are parallel. The marked angles are co-interior.`,
            180 - a,
            "Co-interior angles add to 180°.",
            [
                `${a} + x = 180.`,
                `x = ${180 - a}°.`
            ],
            { diagram: parallelDiagram(a, "cointerior") }
        );
    }

    const a = ri(40, 120);
    const b = ri(35, 105);
    const c = ri(30, 95);
    const x = 360 - a - b - c;

    return qNumeric(
        "Angles Around a Point",
        "Find x in degrees.",
        `Four angles meet at a point.`,
        x,
        "Angles around a point add to 360°.",
        [
            `${a} + ${b} + ${c} = ${a + b + c}.`,
            `x = 360 - ${a + b + c}.`,
            `x = ${x}°.`
        ],
        { diagram: pointAnglesDiagram([a, b, c]) }
    );
}

/* =========================================================
   4.02 TRIANGLES AND CONGRUENT SHAPES
   ========================================================= */

function lesson402(d) {
    const modes = d === 1
        ? ["classifySide", "interior", "congruentSide"]
        : d === 2
            ? ["classifyAngle", "interior", "exterior", "congruentSide"]
            : ["combinedClass", "exterior", "congruentAngle", "interior"];

    const mode = pick(modes);

    if (mode === "classifySide") {
        const type = pick(["equilateral", "isosceles", "scalene"]);
        let sides;
        if (type === "equilateral") {
            const s = ri(3, 12);
            sides = [s, s, s];
        } else if (type === "isosceles") {
            const s = ri(4, 12);
            let b = ri(3, 15);
            while (b === s || b >= 2 * s) b = ri(3, 15);
            sides = [s, s, b];
        } else {
            sides = [5, 7, 9];
        }

        return qText(
            "Triangle Classification",
            "Classify the triangle by its side lengths.",
            `Classify the triangle shown.`,
            [type, `${type} triangle`],
            "Compare the three side lengths.",
            [
                type === "equilateral"
                    ? "All three side lengths are equal."
                    : type === "isosceles"
                        ? "Exactly two side lengths are equal."
                        : "All three side lengths are different.",
                `Answer: ${type}.`
            ],
            { diagram: triangleBySidesDiagram(type, sides) }
        );
    }

    if (mode === "classifyAngle") {
        const type = pick(["acute", "right", "obtuse"]);
        const angles = type === "acute"
            ? [55, 60, 65]
            : type === "right"
                ? [90, 35, 55]
                : [110, 40, 30];

        return qText(
            "Triangle Classification",
            "Classify the triangle by its angles.",
            `Classify the triangle shown.`,
            [type, `${type} triangle`],
            "Look for a 90° angle or an angle greater than 90°.",
            [
                type === "acute"
                    ? "All three angles are less than 90°."
                    : type === "right"
                        ? "One angle is exactly 90°."
                        : "One angle is greater than 90°.",
                `Answer: ${type} triangle.`
            ],
            { diagram: triangleByAnglesDiagram(type, angles) }
        );
    }

    if (mode === "combinedClass") {
        const choices = [
            {
                type: "isosceles right triangle",
                sides: [6, 6, 8.5],
                angles: [90, 45, 45]
            },
            {
                type: "scalene obtuse triangle",
                sides: [5, 7, 9],
                angles: [110, 40, 30]
            },
            {
                type: "equilateral acute triangle",
                sides: [8, 8, 8],
                angles: [60, 60, 60]
            }
        ];
        const c = pick(choices);
        const baseType = c.type.includes("equilateral") ? "equilateral" : c.type.includes("isosceles") ? "isosceles" : "scalene";
        const angleType = c.type.includes("right") ? "right" : c.type.includes("obtuse") ? "obtuse" : "acute";

        return qText(
            "Triangle Classification",
            "Classify the triangle using both side and angle information.",
            `Use the diagram to classify the triangle.`,
            [c.type, c.type.replace(" triangle", "")],
            "Name the side classification first, then the angle classification.",
            [
                `The side information gives the ${baseType} classification.`,
                `The angle information gives the ${angleType} classification.`,
                `Answer: ${c.type}.`
            ],
            { diagram: triangleByAnglesDiagram(angleType, c.angles) }
        );
    }

    if (mode === "interior") {
        const a = ri(25, 80);
        const b = ri(25, 80);
        const x = 180 - a - b;

        return qNumeric(
            "Angles in a Triangle",
            "Find x in degrees.",
            `Find the missing interior angle.`,
            x,
            "Interior angles in a triangle add to 180°.",
            [
                `${a} + ${b} = ${a + b}.`,
                `x = 180 - ${a + b}.`,
                `x = ${x}°.`
            ],
            { diagram: triangleDiagram(a, b) }
        );
    }

    if (mode === "exterior") {
        const a = ri(25, 80);
        const b = ri(25, 80);
        const x = a + b;

        return qNumeric(
            "Exterior Angle of a Triangle",
            "Find x in degrees.",
            `Use the exterior-angle relationship.`,
            x,
            "An exterior angle equals the sum of the two opposite interior angles.",
            [
                `x = ${a} + ${b}.`,
                `x = ${x}°.`
            ],
            { diagram: exteriorTriangleDiagram(a, b) }
        );
    }

    if (mode === "congruentAngle") {
        const angle = ri(25, 150);
        return qNumeric(
            "Congruent Shapes",
            "Find x in degrees.",
            `The two polygons are congruent. Find x.`,
            angle,
            "Corresponding angles in congruent shapes are equal.",
            [
                "Congruent shapes have equal corresponding angles.",
                `x = ${angle}°.`
            ],
            { diagram: congruentAnglesDiagram(angle) }
        );
    }

    const side = ri(3, 25);
    return qNumeric(
        "Congruent Shapes",
        "Find x.",
        `The two polygons are congruent. Find x.`,
        side,
        "Corresponding sides in congruent shapes are equal.",
        [
            "Congruent shapes have equal corresponding side lengths.",
            `x = ${side} cm.`
        ],
        { diagram: congruentPolygonsDiagram(side) }
    );
}

/* =========================================================
   4.03 TRANSFORMATIONS
   ========================================================= */

function lesson403(d) {
    const modes = d === 1
        ? ["translation", "reflection"]
        : d === 2
            ? ["translation", "reflection", "rotation180"]
            : ["translation", "reflection", "rotation90cw", "rotation90ccw"];

    const mode = pick(modes);

    const x = nonZeroInt(-5, 5);
    const y = nonZeroInt(-4, 4);

    if (mode === "translation") {
        const dx = nonZeroInt(-5, 5);
        const dy = nonZeroInt(-4, 4);

        return qPair(
            "Translation",
            "Enter the image point as (x, y).",
            `Point A is shown on the coordinate grid. Translate it ${Math.abs(dx)} ${dx > 0 ? "right" : "left"} and ${Math.abs(dy)} ${dy > 0 ? "up" : "down"}.`,
            [x + dx, y + dy],
            "Add the horizontal change to x and the vertical change to y.",
            [
                `New x-coordinate: ${x} + (${dx}) = ${x + dx}.`,
                `New y-coordinate: ${y} + (${dy}) = ${y + dy}.`,
                `A′ = (${x + dx}, ${y + dy}).`
            ],
            { diagram: coordinateGrid([x, y]) }
        );
    }

    if (mode === "reflection") {
        const axis = pick(["x-axis", "y-axis"]);
        const answer = axis === "x-axis" ? [x, -y] : [-x, y];

        return qPair(
            "Reflection",
            "Enter the image point as (x, y).",
            `Reflect A in the ${axis}.`,
            answer,
            axis === "x-axis"
                ? "Reflection in the x-axis changes the sign of y."
                : "Reflection in the y-axis changes the sign of x.",
            [
                axis === "x-axis"
                    ? `Keep x = ${x} and change ${y} to ${-y}.`
                    : `Change ${x} to ${-x} and keep y = ${y}.`,
                `A′ = (${answer[0]}, ${answer[1]}).`
            ],
            { diagram: coordinateGrid([x, y]) }
        );
    }

    if (mode === "rotation180") {
        return qPair(
            "Rotation",
            "Enter the image point as (x, y).",
            `Rotate A 180° about the origin.`,
            [-x, -y],
            "A 180° rotation about the origin changes both coordinate signs.",
            [
                `(x, y) → (-x, -y).`,
                `A′ = (${-x}, ${-y}).`
            ],
            { diagram: coordinateGrid([x, y]) }
        );
    }

    if (mode === "rotation90cw") {
        return qPair(
            "Rotation",
            "Enter the image point as (x, y).",
            `Rotate A 90° clockwise about the origin.`,
            [y, -x],
            "For a 90° clockwise turn about the origin, (x, y) → (y, -x).",
            [
                `(${x}, ${y}) → (${y}, ${-x}).`,
                `A′ = (${y}, ${-x}).`
            ],
            { diagram: coordinateGrid([x, y]) }
        );
    }

    return qPair(
        "Rotation",
        "Enter the image point as (x, y).",
        `Rotate A 90° anticlockwise about the origin.`,
        [-y, x],
        "For a 90° anticlockwise turn about the origin, (x, y) → (-y, x).",
        [
            `(${x}, ${y}) → (${-y}, ${x}).`,
            `A′ = (${-y}, ${x}).`
        ],
        { diagram: coordinateGrid([x, y]) }
    );
}

/* =========================================================
   4.04 SYMMETRY
   ========================================================= */

function lesson404(d) {
    const shapes = [
        {name: "square", lines: 4, order: 4},
        {name: "rectangle", lines: 2, order: 2},
        {name: "rhombus", lines: 2, order: 2},
        {name: "parallelogram", lines: 0, order: 2},
        {name: "kite", lines: 1, order: 1},
        {name: "isosceles trapezoid", lines: 1, order: 1},
        {name: "irregular quadrilateral", lines: 0, order: 1}
    ];

    const allowed = d === 1 ? shapes.slice(0, 4) : shapes;
    const shape = pick(allowed);
    const mode = pick(["line", "rotation"]);

    if (mode === "line") {
        return qNumeric(
            "Line Symmetry",
            "How many lines of symmetry?",
            `Look at the shape shown.`,
            shape.lines,
            "Imagine folding the shape along every possible mirror line.",
            [
                `A ${shape.name} has ${shape.lines} line${shape.lines === 1 ? "" : "s"} of symmetry.`,
                `Answer: ${shape.lines}.`
            ],
            { diagram: squareSymmetryDiagram(shape.name) }
        );
    }

    return qNumeric(
        "Rotational Symmetry",
        "What is the order of rotational symmetry?",
        `Look at the shape shown.`,
        shape.order,
        "Count how many times the shape matches itself during one complete 360° turn.",
        [
            `A ${shape.name} matches itself ${shape.order} time${shape.order === 1 ? "" : "s"} in a full turn.`,
            `Answer: order ${shape.order}.`
        ],
        { diagram: rotationOrderDiagram(shape.name) }
    );
}

/* =========================================================
   4.05 SIMILAR SHAPES
   ========================================================= */

function lesson405(d) {
    const mode = pick(
        d === 1
            ? ["scale", "missing"]
            : d === 2
                ? ["scale", "missing", "similarYesNo"]
                : ["missing", "similarYesNo", "fractionScale"]
    );

    if (mode === "scale") {
        const original = ri(2, 12);
        const k = pick([2, 3, 4, 1.5, 2.5]);
        const image = original * k;

        return qNumeric(
            "Scale Factor",
            "Find the scale factor from the smaller shape to the larger shape.",
            `Use the corresponding side lengths shown.`,
            k,
            "Scale factor = image length ÷ original length.",
            [
                `Scale factor = ${image} ÷ ${original}.`,
                `Scale factor = ${k}.`
            ],
            { diagram: rectangleSimilarityDiagram(image, original, image, `${original}`) }
        );
    }

    if (mode === "missing" || mode === "fractionScale") {
        const smallA = ri(2, 10);
        const k = mode === "fractionScale" ? pick([1.5, 2.5]) : ri(2, 4);
        const largeA = smallA * k;
        const smallB = ri(2, 12);
        const answer = smallB * k;

        return qNumeric(
            "Missing Side in Similar Shapes",
            "Find x in centimetres.",
            `The rectangles are similar. Use corresponding side lengths.`,
            answer,
            `The scale factor is ${largeA} ÷ ${smallA}. Apply the same factor to the other side.`,
            [
                `Scale factor = ${largeA} ÷ ${smallA} = ${k}.`,
                `x = ${smallB} × ${k}.`,
                `x = ${answer} cm.`
            ],
            { diagram: rectangleSimilarityDiagram(largeA, smallA, answer, smallB) }
        );
    }

    const k1 = pick([2, 3, 4]);
    const isSimilar = Math.random() < 0.55;
    const a = ri(2, 8);
    const b = ri(3, 10);
    const c = a * k1;
    const d2 = isSimilar ? b * k1 : b * k1 + pick([-2, -1, 1, 2]);

    return qText(
        "Recognizing Similar Shapes",
        "Are the shapes similar? Enter yes or no.",
        `Compare the corresponding side lengths in the two rectangles shown.`,
        isSimilar ? ["yes", "y"] : ["no", "n"],
        "Compare the scale factors for both pairs of corresponding sides.",
        [
            `First scale factor = ${c} ÷ ${a} = ${c / a}.`,
            `Second scale factor = ${d2} ÷ ${b} = ${round(d2 / b, 3)}.`,
            `The shapes are ${isSimilar ? "" : "not "}similar.`
        ],
        { diagram: rectangleSimilarityDiagram(c, a, d2, b) }
    );
}

/* =========================================================
   4.06 SCALE DIAGRAMS
   ========================================================= */

function lesson406(d) {
    const modes = d === 1
        ? ["statementActual", "ratioScale"]
        : d === 2
            ? ["statementActual", "ratioScale", "mapActual"]
            : ["mapActual", "mapDrawing", "ratioScale"];

    const mode = pick(modes);

    if (mode === "statementActual") {
        const drawingUnit = pick([1, 2, 4, 5]);
        const actualMetres = pick([1, 2, 3]);
        const drawingLength = drawingUnit * ri(2, 9);
        const answer = drawingLength / drawingUnit * actualMetres;

        return qNumeric(
            "Statement Scale",
            "Find the actual length in metres.",
            `Use the scale diagram.`,
            answer,
            `Work out how many groups of ${drawingUnit} cm are in ${drawingLength} cm.`,
            [
                `${drawingLength} ÷ ${drawingUnit} = ${drawingLength / drawingUnit}.`,
                `Actual length = ${drawingLength / drawingUnit} × ${actualMetres}.`,
                `Answer: ${answer} m.`
            ],
            { diagram: scaleBarDiagram(drawingUnit, actualMetres, drawingLength) }
        );
    }

    if (mode === "ratioScale") {
        const drawing = pick([2, 3, 4, 5]);
        const actualKm = pick([0.5, 1, 1.5, 2, 2.5]);
        const actualCm = actualKm * 100000;
        const r = actualCm / drawing;

        return qNumeric(
            "Writing a Map Scale",
            "Find r in the scale 1:r.",
            `A map distance and actual distance are shown.`,
            r,
            "Convert the actual distance to centimetres, then simplify the ratio so the map side is 1.",
            [
                `${actualKm} km = ${actualCm.toLocaleString()} cm.`,
                `${drawing}:${actualCm.toLocaleString()} = 1:${r.toLocaleString()}.`,
                `r = ${r}.`
            ],
            { diagram: mapScaleDiagram(r, drawing) }
        );
    }

    if (mode === "mapActual") {
        const r = pick([10000, 25000, 50000, 100000]);
        const mapCm = pick([2.4, 3.6, 4.8, 6.2, 7.5, 9.6]);
        const actualKm = mapCm * r / 100000;

        return qNumeric(
            "Map Scale",
            "Find the actual distance in kilometres.",
            `Use the map scale and line segment shown.`,
            actualKm,
            "Multiply the map length by the scale number, then convert centimetres to kilometres.",
            [
                `Actual distance = ${mapCm} × ${r.toLocaleString()} cm.`,
                `= ${(mapCm * r).toLocaleString()} cm.`,
                `= ${actualKm} km.`
            ],
            {
                tolerance: 1e-8,
                diagram: mapScaleDiagram(r, mapCm)
            }
        );
    }

    const r = pick([10000, 25000, 50000]);
    const actualKm = pick([1, 1.5, 2, 2.5, 3, 4]);
    const mapCm = actualKm * 100000 / r;

    return qNumeric(
        "Map Scale",
        "Find the distance on the map in centimetres.",
        `Use the map scale to determine the map length.`,
        mapCm,
        "Convert the actual distance to centimetres, then divide by the scale number.",
        [
            `${actualKm} km = ${(actualKm * 100000).toLocaleString()} cm.`,
            `Map distance = ${(actualKm * 100000).toLocaleString()} ÷ ${r.toLocaleString()}.`,
            `Answer: ${mapCm} cm.`
        ],
        { diagram: mapScaleDiagram(r, "?") }
    );
}

/* =========================================================
   4.07 AREA AND COMPOSITE SHAPES
   ========================================================= */

function lesson407(d) {
    const modes = d === 1
        ? ["rectangle", "triangle", "circle"]
        : d === 2
            ? ["triangle", "circle", "cutCorner", "squareFromArea"]
            : ["cutCorner", "addRectangles", "circle", "squarePerimeterFromArea"];

    const mode = pick(modes);

    if (mode === "rectangle") {
        const l = ri(4, 20);
        const w = ri(3, 15);

        return qNumeric(
            "Area of a Rectangle",
            "Find the area in cm².",
            `Find the area of the rectangle shown.`,
            l * w,
            "Use A = length × width.",
            [
                `A = ${l} × ${w}.`,
                `A = ${l * w} cm².`
            ],
            { diagram: rectangleAreaDiagram(l, w) }
        );
    }

    if (mode === "triangle") {
        const b = ri(4, 20);
        const h = ri(3, 15);

        return qNumeric(
            "Area of a Triangle",
            "Find the area in cm².",
            `Find the area of the triangle shown.`,
            b * h / 2,
            "Use A = ½bh.",
            [
                `A = ½(${b})(${h}).`,
                `A = ${b * h / 2} cm².`
            ],
            { diagram: triangleAreaDiagram(b, h) }
        );
    }

    if (mode === "circle") {
        const r = ri(2, 12);
        const answer = round(Math.PI * r * r, 1);

        return qNumeric(
            "Area of a Circle",
            "Find the area in cm², rounded to the nearest tenth.",
            `Find the area of the circle shown.`,
            answer,
            "Use A = πr².",
            [
                `A = π(${r})².`,
                `A ≈ ${(Math.PI * r * r).toFixed(3)}.`,
                `A ≈ ${answer} cm².`
            ],
            {
                tolerance: 0.05,
                diagram: circleDiagram(r, "r")
            }
        );
    }

    if (mode === "cutCorner") {
        const w = ri(10, 18);
        const h = ri(8, 14);
        const cw = ri(2, 5);
        const ch = ri(2, 5);
        const answer = w * h - cw * ch / 2;

        return qNumeric(
            "Composite Area",
            "Find the remaining area in cm².",
            `A rectangle has a right-triangle corner removed.`,
            answer,
            "Find the rectangle area, then subtract the area of the right triangle.",
            [
                `Rectangle area = ${w} × ${h} = ${w * h}.`,
                `Triangle area = ½(${cw})(${ch}) = ${cw * ch / 2}.`,
                `Remaining area = ${answer} cm².`
            ],
            { diagram: compositeCutDiagram(w, h, cw, ch) }
        );
    }

    if (mode === "addRectangles") {
        const a = ri(3, 8);
        const b = ri(5, 12);
        const c = ri(2, 7);
        const d2 = ri(3, 10);
        const answer = a * b + c * d2;

        return qNumeric(
            "Composite Area",
            "Find the total area in cm².",
            `Split the L-shape into two rectangles and find its area.`,
            answer,
            "Find each rectangle area and add them.",
            [
                `First area = ${a * b} cm².`,
                `Second area = ${c * d2} cm².`,
                `Total = ${answer} cm².`
            ],
            { diagram: lShapeDiagram(a, b, c, d2) }
        );
    }

    if (mode === "squareFromArea") {
        const s = ri(3, 20);
        const area = s * s;

        return qNumeric(
            "Area of a Square",
            "Find the side length in centimetres.",
            `The square shown has the given area.`,
            s,
            "For a square, A = s². Take the positive square root.",
            [
                `s = √${area}.`,
                `s = ${s} cm.`
            ],
            { diagram: squareAreaDiagram(area) }
        );
    }

    const s = ri(4, 20);
    const area = s * s;

    return qNumeric(
        "Square Area and Perimeter",
        "Find the perimeter in centimetres.",
        `The square shown has the given area.`,
        4 * s,
        "First find the side length using the square root, then multiply by 4.",
        [
            `s = √${area} = ${s} cm.`,
            `P = 4s = 4(${s}).`,
            `P = ${4 * s} cm.`
        ],
        { diagram: squareAreaDiagram(area) }
    );
}

/* =========================================================
   4.08 SURFACE AREA OF PRISMS
   ========================================================= */

function lesson408(d) {
    const modes = d === 1
        ? ["cuboid"]
        : d === 2
            ? ["cuboid", "triangular"]
            : ["cuboid", "triangular", "crossSection"];

    const mode = pick(modes);

    if (mode === "cuboid") {
        const l = ri(3, 14);
        const w = ri(2, 10);
        const h = ri(2, 12);
        const answer = 2 * (l * w + l * h + w * h);

        return qNumeric(
            "Surface Area of a Rectangular Prism",
            "Find the surface area in cm².",
            `Find the surface area of the prism shown.`,
            answer,
            "Add the areas of the three pairs of matching rectangular faces.",
            [
                `SA = 2(lw + lh + wh).`,
                `SA = 2(${l * w} + ${l * h} + ${w * h}).`,
                `SA = ${answer} cm².`
            ],
            { diagram: cuboidDiagram(l, w, h) }
        );
    }

    if (mode === "triangular") {
        const triples = [
            [3, 4, 5],
            [5, 12, 13],
            [6, 8, 10],
            [8, 15, 17]
        ];
        const [a, b, c] = pick(triples);
        const length = ri(4, 14);
        const baseArea = a * b / 2;
        const lateral = (a + b + c) * length;
        const answer = 2 * baseArea + lateral;

        return qNumeric(
            "Surface Area of a Triangular Prism",
            "Find the surface area in cm².",
            `Find the surface area of the triangular prism shown.`,
            answer,
            "Find both triangular ends, then add the three rectangular lateral faces.",
            [
                `Two triangle areas = 2(½×${a}×${b}) = ${2 * baseArea}.`,
                `Lateral area = (${a}+${b}+${c})(${length}) = ${lateral}.`,
                `Total SA = ${answer} cm².`
            ],
            { diagram: triangularPrismDiagram(a, b, c, length) }
        );
    }

    const crossArea = ri(20, 90);
    const perimeter = ri(18, 46);
    const length = ri(4, 14);
    const answer = 2 * crossArea + perimeter * length;

    return qNumeric(
        "Surface Area from a Prism Cross-Section",
        "Find the surface area in cm².",
        `Use the prism information shown.`,
        answer,
        "Use two end faces plus perimeter × prism length for the lateral faces.",
        [
            `End faces = 2(${crossArea}) = ${2 * crossArea}.`,
            `Lateral area = ${perimeter}(${length}) = ${perimeter * length}.`,
            `Total SA = ${answer} cm².`
        ],
        { diagram: crossSectionPrismDiagram(crossArea, perimeter, length) }
    );
}

/* =========================================================
   4.09 SURFACE AREA OF CYLINDERS
   ========================================================= */

function lesson409(d) {
    const modes = d === 1
        ? ["closed", "curved"]
        : d === 2
            ? ["closed", "curved", "openTop"]
            : ["closed", "openTop", "reverseHeight"];

    const mode = pick(modes);

    if (mode === "closed") {
        const r = ri(2, 10);
        const h = ri(4, 18);
        const exactCoeff = 2 * r * r + 2 * r * h;
        const answer = round(Math.PI * exactCoeff, 1);

        return qNumeric(
            "Closed Cylinder Surface Area",
            "Find the total surface area in cm², rounded to the nearest tenth.",
            `Find the total surface area of the cylinder shown.`,
            answer,
            "Use SA = 2πr² + 2πrh.",
            [
                `SA = 2π(${r}²) + 2π(${r})(${h}).`,
                `SA = ${exactCoeff}π.`,
                `SA ≈ ${answer} cm².`
            ],
            {
                tolerance: 0.05,
                diagram: cylinderDiagram(r, h)
            }
        );
    }

    if (mode === "curved") {
        const r = ri(2, 10);
        const h = ri(4, 18);
        const exactCoeff = 2 * r * h;
        const answer = round(Math.PI * exactCoeff, 1);

        return qNumeric(
            "Curved Surface Area",
            "Find the curved surface area in cm², rounded to the nearest tenth.",
            `Find the curved surface area of the cylinder shown.`,
            answer,
            "The curved face unwraps to a rectangle with length 2πr and height h.",
            [
                `CSA = 2πrh.`,
                `CSA = ${exactCoeff}π.`,
                `CSA ≈ ${answer} cm².`
            ],
            {
                tolerance: 0.05,
                diagram: cylinderDiagram(r, h)
            }
        );
    }

    if (mode === "openTop") {
        const r = ri(2, 10);
        const h = ri(4, 18);
        const exactCoeff = r * r + 2 * r * h;
        const answer = round(Math.PI * exactCoeff, 1);

        return qNumeric(
            "Open-Top Cylinder",
            "Find the surface area in cm², rounded to the nearest tenth.",
            `Find the surface area of the open-top cylinder shown.`,
            answer,
            "Count one circular base plus the curved surface.",
            [
                `SA = πr² + 2πrh.`,
                `SA = ${r * r}π + ${2 * r * h}π = ${exactCoeff}π.`,
                `SA ≈ ${answer} cm².`
            ],
            {
                tolerance: 0.05,
                diagram: cylinderDiagram(r, h, true)
            }
        );
    }

    const r = ri(2, 8);
    const h = ri(4, 16);
    const exactCoeff = 2 * r * r + 2 * r * h;
    const surfaceArea = Math.PI * exactCoeff;

    return qNumeric(
        "Reverse Surface Area",
        "Find the height in centimetres.",
        `The cylinder shown has total surface area ${round(surfaceArea, 3)} cm².`,
        h,
        "Start with SA = 2πr² + 2πrh and solve for h.",
        [
            `${round(surfaceArea, 3)} ≈ 2π(${r}²) + 2π(${r})h.`,
            `Subtract the two base areas, then divide by 2πr.`,
            `h = ${h} cm.`
        ],
        { tolerance: 0.01, diagram: cylinderDiagram(r, "?") }
    );
}

/* =========================================================
   REGISTRY
   ========================================================= */

const generators = {
    lesson401,
    lesson402,
    lesson403,
    lesson404,
    lesson405,
    lesson406,
    lesson407,
    lesson408,
    lesson409
};

/* =========================================================
   ANSWER CHECKING
   ========================================================= */

function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[.,]/g, "")
        .replace(/\s+/g, " ");
}

function parseNumber(raw) {
    const cleaned = String(raw ?? "")
        .trim()
        .replace(/,/g, "")
        .replace(/°/g, "")
        .replace(/\b(?:cm|mm|m|km|ft|in|yd)(?:\^?2|\^?3|²|³)?\b/gi, "")
        .trim();

    if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) return Number(cleaned);

    const frac = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
    if (frac && Number(frac[2]) !== 0) return Number(frac[1]) / Number(frac[2]);

    return NaN;
}

function parsePair(raw) {
    const cleaned = String(raw ?? "")
        .trim()
        .replace(/[()[\]<>]/g, "")
        .replace(/\s+/g, "");

    const parts = cleaned.split(",");
    if (parts.length !== 2) return null;

    const a = Number(parts[0]);
    const b = Number(parts[1]);

    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return [a, b];
}

function validate(q, raw) {
    if (q.type === "text") {
        const entered = normalizeText(raw);
        if (!entered) return {valid: false, message: "Enter your answer."};

        const correct = q.answers.some(a => normalizeText(a) === entered);
        return {valid: true, correct};
    }

    if (q.type === "pair") {
        const entered = parsePair(raw);
        if (!entered) {
            return {valid: false, message: "Enter a coordinate pair such as (3, -2)."};
        }

        return {
            valid: true,
            correct:
                Math.abs(entered[0] - q.answer[0]) < 1e-9 &&
                Math.abs(entered[1] - q.answer[1]) < 1e-9
        };
    }

    const value = parseNumber(raw);
    if (!Number.isFinite(value)) {
        return {valid: false, message: "Enter a numerical answer."};
    }

    return {
        valid: true,
        correct: Math.abs(value - q.answer) <= (q.tolerance ?? 1e-9)
    };
}

/* =========================================================
   RENDERING
   ========================================================= */

function renderQuestion(q) {
    els.problem.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "geometry-question";

    if (q.prompt) {
        const wording = document.createElement("div");
        wording.className = "question-wording";
        wording.textContent = q.prompt;
        wrapper.appendChild(wording);
    }

    if (q.diagram) {
        const diagram = document.createElement("div");
        diagram.innerHTML = q.diagram;
        wrapper.appendChild(diagram.firstElementChild);
    }

    els.problem.appendChild(wrapper);
}

let previewVersion = 0;

function renderAnswerPreview() {
    const raw = els.input.value.trim();
    previewVersion++;
    const version = previewVersion;

    if (!raw) {
        els.preview.innerHTML = '<span class="answer-preview-placeholder">Your formatted answer will appear here.</span>';
        els.previewHelp.textContent = "Numbers, words, coordinate pairs, and LaTeX are accepted where appropriate.";
        return;
    }

    if (state.question?.previewMode === "text") {
        els.preview.textContent = raw;
        els.previewHelp.textContent = "This question expects a word or short phrase.";
        return;
    }

    if (!window.MathJax || typeof window.MathJax.tex2chtmlPromise !== "function") {
        els.preview.textContent = raw;
        return;
    }

    window.MathJax.tex2chtmlPromise(raw, {display: true})
        .then(node => {
            if (version !== previewVersion) return;
            els.preview.innerHTML = "";
            els.preview.appendChild(node);
            els.previewHelp.textContent = "This is how your answer will be displayed.";
        })
        .catch(() => {
            if (version !== previewVersion) return;
            els.preview.textContent = raw;
            els.previewHelp.textContent = "Plain text is still accepted even if MathJax cannot format the entry.";
        });
}

function setTab(name) {
    els.tabs.forEach(tab => {
        const active = tab.dataset.tab === name;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
    });

    els.panels.forEach(panel => {
        panel.classList.toggle("active", panel.id === name);
    });

    if (name === "practice") {
        setTimeout(() => els.input?.focus(), 50);
    }
}

function newQuestion() {
    const generator = generators[lessonKey];
    if (!generator) return;

    const d = difficulty();
    state.qnum++;
    state.question = {...generator(d), difficulty: d};
    state.counted = false;

    const q = state.question;

    els.skill.textContent = q.skill;
    els.number.textContent = state.qnum;
    els.instruction.textContent = q.instruction;
    els.pill.textContent = difficultyNames[d];
    els.label.textContent = difficultyNames[d];

    renderQuestion(q);

    els.input.value = "";
    renderAnswerPreview();

    els.feedback.className = "feedback";
    els.feedback.textContent = "";

    els.hintBox.hidden = true;
    els.solutionBox.hidden = true;
    els.hint.textContent = "Hint";
    els.solution.textContent = "Show Solution";

    els.input.focus();
}

function checkAnswer() {
    const q = state.question;
    if (!q) return;

    const result = validate(q, els.input.value);

    if (!result.valid) {
        els.feedback.className = "feedback info";
        els.feedback.textContent = result.message;
        return;
    }

    if (!state.counted) {
        state.progress.attempted++;

        if (result.correct) {
            state.progress.correct++;
            state.progress.streak++;
        } else {
            state.progress.streak = 0;
        }

        state.counted = true;
        saveProgress();
        renderProgress();
    }

    if (result.correct) {
        els.feedback.className = "feedback success";
        els.feedback.textContent = "Correct. Nice work.";
    } else {
        els.feedback.className = "feedback error";
        els.feedback.textContent = "Not quite. Check the relationship, try the hint, or view the worked solution.";
    }
}

function toggleHint() {
    if (!state.question) return;

    const open = els.hintBox.hidden;
    els.hintBox.hidden = !open;
    els.hint.textContent = open ? "Hide Hint" : "Hint";

    if (open) {
        els.hintBox.innerHTML = `<strong>Hint</strong><p>${state.question.hint}</p>`;
    }
}

function toggleSolution() {
    if (!state.question) return;

    const open = els.solutionBox.hidden;
    els.solutionBox.hidden = !open;
    els.solution.textContent = open ? "Hide Solution" : "Show Solution";

    if (open) {
        els.solutionBox.innerHTML = `<strong>Worked Solution</strong><ol>${
            state.question.steps.map(step => `<li>${step}</li>`).join("")
        }</ol>`;
    }
}

function renderProgress() {
    const p = state.progress;
    const accuracy = p.attempted ? Math.round((p.correct / p.attempted) * 100) : 0;

    els.attempted.textContent = p.attempted;
    els.correct.textContent = p.correct;
    els.streak.textContent = p.streak;
    els.accuracy.textContent = `${accuracy}%`;

    els.ring.style.setProperty("--progress", `${accuracy * 3.6}deg`);
    els.masteryBar.style.width = `${Math.min(100, p.attempted * 10)}%`;

    els.masteryText.textContent =
        p.attempted >= 10 && accuracy >= 80
            ? "Completed ✓"
            : `${Math.min(10, p.attempted)} / 10`;

    els.label.textContent = difficultyNames[difficulty()];
}

function resetProgress() {
    if (!confirm(`Reset saved progress for Lesson ${lessonId}?`)) return;

    state.progress = {attempted: 0, correct: 0, streak: 0};
    state.qnum = 0;

    saveProgress();
    renderProgress();
    newQuestion();
}

/* =========================================================
   EVENTS
   ========================================================= */

els.tabs.forEach(tab => {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
});

els.start?.addEventListener("click", () => setTab("practice"));
els.check?.addEventListener("click", checkAnswer);
els.input?.addEventListener("input", renderAnswerPreview);

els.input?.addEventListener("keydown", event => {
    if (event.key === "Enter") checkAnswer();
});

els.hint?.addEventListener("click", toggleHint);
els.solution?.addEventListener("click", toggleSolution);
els.next?.addEventListener("click", newQuestion);
els.reset?.addEventListener("click", resetProgress);
els.quizButton?.addEventListener("click", () => els.quizDialog?.showModal());

renderProgress();
newQuestion();

})();