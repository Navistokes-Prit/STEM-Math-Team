MATH 9 — UNIT 2: POWERS AND EXPONENTS

RENUBMERING
-----------
The original Lesson 02.06 was a quiz and has been omitted from the instructional lesson list.

The instructional sequence is therefore:

2.01 Product Law
2.02 Quotient Law
2.03 Product and Quotient with Coefficients
2.04 Power of a Power
2.05 Power of a Quotient
2.06 Zero Law and PAT Practice       (original 02.07)
2.07 Changing the Base               (original 02.08)
2.08 Powers and Exponents Review     (original 02.09)

FILES
-----
lesson-2-01.html
lesson-2-02.html
lesson-2-03.html
lesson-2-04.html
lesson-2-05.html
lesson-2-06.html
lesson-2-07.html
lesson-2-08.html
unit2-engine.js
unit-quiz.html

PATHS
-----
Lesson pages use the requested shared stylesheet path:

../../css/styles.css

The top navigation uses:

Home      -> ../index.html
Progress  -> #progress-card
Resources -> #lesson-notes

Keep unit2-engine.js in the same folder as the Unit 2 lesson HTML files.

PRACTICE
--------
Each lesson includes Learn and Practice tabs on the SAME page.
The practice engine includes:
- generated questions
- answer checking
- hints
- worked solutions
- new problem generation
- adaptive Foundation / Standard / Challenge progression
- independent localStorage progress for every lesson

For algebraic answers, students should type ^ for exponents.
Example:
3x^5

UNIT QUIZ
---------
The final unit-quiz.html file includes the same simple classroom password lock used in Unit 1.
Change:

const TEACHER_PASSWORD = "CHANGE-THIS-PASSWORD";

to the password you want.

A static GitHub Pages password can be discovered by inspecting source code, so this is not secure authentication.


LATEX / MATHJAX UPDATE
----------------------
Generated practice equations now render with MathJax using LaTeX-style
mathematical typesetting.

This fixes problems where exponents and factors could wrap vertically,
for example:

a
1
× a
2

The same question will now render as a properly aligned mathematical
expression such as a¹ × a².

MathJax is loaded from:
https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js

Because the course is hosted on GitHub Pages, this CDN approach works
without requiring a server or build step.

Long equations stay on one mathematical line and become horizontally
scrollable on small screens instead of breaking into unreadable stacks.


LIVE LATEX STUDENT ANSWERS
--------------------------
Unit 2 now has a live MathJax preview under the student answer field.

Students may type, for example:

3^5
3^{5}
12a^6
12a^{6}
-2a^4
x^{-3}
\frac{x^8}{x^3}
(3x^2)^4

The answer is rendered immediately underneath the input.

ANSWER CHECKING
---------------
The checker no longer compares raw text character-for-character.

For expression questions, it parses the student's expression into a
canonical monomial form and compares the mathematics.

Examples that are treated as equivalent:

3^5
3^{5}
3 ^ { 5 }

12a^6
12a^{6}
12 a^6

x^8 / x^3
\frac{x^8}{x^3}
x^5

For a question that explicitly requires a representation such as:

"Write as one power with base 3"

the required base is still enforced. Therefore:

3^5     accepted
3^{5}   accepted
243     mathematically equal, but not accepted for that specific prompt

NEW FILE
--------
unit2-math.css

Keep this file in the same Unit 2 folder as the lesson HTML pages.
