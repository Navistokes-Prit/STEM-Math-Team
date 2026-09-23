MATH 9 — UNIT 5: LINEAR RELATIONS, EQUATIONS & INEQUALITIES

SOURCE MATERIAL
---------------
Built from the uploaded lesson decks:
05.01 Coordinates and Sequences
05.02 Table of Values and Plotting
05.03 Plotting Table of Values
05.04 Slope and y-intercept
05.05 Equation of a Line
05.06 Parallel Lines
05.07 Slope Between Points
05.08 Equation from Table of Values
05.09 Solving Equations 1
05.10 Solving Equations 2
05.11 Forming Linear Equations to Solve Problems
05.12 Inequalities 1
05.13 Inequalities 2

LAYOUT
------
The lesson pages intentionally reuse the same Unit 2 structure:
- same site header and sidebar
- Learn / Practice tabs on the same page
- generated adaptive questions
- hints and step-by-step worked solutions
- live MathJax answer preview
- lesson progress stored in localStorage
- locked unit quiz page

FILES
-----
lesson-5-01.html through lesson-5-13.html
unit5-engine.js
unit5-math.css
unit-quiz.html

PATHS
-----
Lesson pages expect the existing shared course stylesheet at:

../../css/styles.css

Keep unit5-engine.js and unit5-math.css in the same Unit 5 folder as the lesson HTML files.

MATHJAX
-------
MathJax is loaded from:
https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js

Generated equations and worked solutions use LaTeX-friendly notation. The answer checker accepts
common student forms including fractions such as 3/2, line equations such as y=2x-3, ordered pairs,
and inequality symbols < > <= >= ≤ ≥.

FUNCTION / GRAPH LESSONS
------------------------
Lessons 5.01–5.08 include coordinate-plane diagrams or generated graphs. The practice engine creates
new graph/table questions so students can see the line, plotted point, or table required by the prompt.

UNIT QUIZ
---------
Change:
const TEACHER_PASSWORD = "CHANGE-THIS-PASSWORD";
inside unit-quiz.html to the classroom password you want.

A static GitHub Pages password is only a classroom gate; it is not secure authentication.
