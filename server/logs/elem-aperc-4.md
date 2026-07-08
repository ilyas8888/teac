<html lang="fr" class="reveal-full-page"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Introduction a Java</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/white.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css">
  <style>
    :root { --r-main-font: Inter, system-ui, sans-serif; --r-heading-font: Inter, system-ui, sans-serif; --r-code-font: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace; }
    .reveal section { text-align: left; }
    .reveal h1, .reveal h2, .reveal h3 { text-align: inherit; letter-spacing: 0; line-height: 1.08; }
    .reveal p, .reveal li { line-height: 1.35; }
    .reveal img { max-height: 58vh; object-fit: contain; border-radius: 12px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16); }
    .reveal figcaption { margin-top: 0.6rem; font-size: 0.5em; color: #64748b; }
    .reveal pre { width: 100%; border-radius: 14px; padding: 1rem; background: #0f172a; color: #e2e8f0; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22); }
    .reveal pre code, .reveal code { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace; }
    .reveal :not(pre) > code { border-radius: 0.35rem; padding: 0.08em 0.32em; background: rgba(15, 23, 42, 0.1); color: #4338ca; }
    .reveal blockquote { margin-left: 0; padding: 0.85rem 1.1rem; border-left: 6px solid #4f46e5; background: rgba(79, 70, 229, 0.08); box-shadow: none; font-style: normal; }
    .reveal table { width: 100%; border-collapse: collapse; font-size: 0.72em; }
    .reveal th, .reveal td { padding: 0.55rem 0.7rem; border: 1px solid rgba(148, 163, 184, 0.5); }
    .reveal thead tr { background: rgba(79, 70, 229, 0.16); }
    .reveal tbody tr:nth-child(even) { background: rgba(148, 163, 184, 0.12); }
    .check-item { list-style: none; display: flex; align-items: center; gap: 0.55rem; }
    .check-item input { width: 0.9em; height: 0.9em; accent-color: #4f46e5; }
    .embed-card { width: 100%; margin: 1rem 0; border-radius: 16px; overflow: hidden; background: #0f172a; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22); }
    .embed-card iframe { display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; }
    .file-link { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.85rem; border: 1px solid rgba(79, 70, 229, 0.3); border-radius: 10px; color: #4338ca; background: rgba(79, 70, 229, 0.08); text-decoration: none; font-weight: 600; }
    .link-card { display: flex; gap: 1rem; align-items: center; padding: 1rem; border: 1px solid rgba(148, 163, 184, 0.45); border-radius: 14px; color: inherit; text-decoration: none; background: rgba(255, 255, 255, 0.82); box-shadow: 0 14px 35px rgba(15, 23, 42, 0.12); }
    .link-card img { width: 120px; height: 80px; object-fit: cover; flex: 0 0 auto; }
    .link-card small { display: block; margin-top: 0.4rem; color: #64748b; }
    .title-slide { min-height: 78vh; display: flex !important; flex-direction: column; justify-content: center; }
    .title-slide .course-badge { display: inline-flex; width: fit-content; margin-bottom: 1.3rem; padding: 0.35rem 0.7rem; border-radius: 999px; background: rgba(79, 70, 229, 0.14); color: #4338ca; font-size: 0.38em; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    .title-slide h1 { max-width: 13ch; margin-bottom: 0.55rem; font-size: 2.35em; font-weight: 800; }
    .title-slide .objectives { max-width: 820px; color: #475569; font-size: 0.78em; }
    .title-slide .meta { margin-top: 1.6rem; color: #64748b; font-size: 0.45em; font-weight: 600; }
    details { margin: 0.8rem 0; }
    summary { cursor: pointer; font-weight: 700; }
    audio, video { margin: 0.8rem 0; }
  </style>
</head>
<body class="reveal-viewport" style="--slide-width: 960px; --slide-height: 700px; --slide-scale: 0.8; --viewport-width: 800px; --viewport-height: 599px;">
  <div class="reveal slide center focused has-horizontal-slides" role="application" data-transition-speed="default" data-background-transition="fade" style="cursor: none;">
    <div class="slides no-transition" style="width: 960px; height: 700px; inset: 50% auto auto 50%; transform: translate(-50%, -50%) scale(0.8);">
      <section class="title-slide present" style="top: 0px; display: block;">
        <div class="course-badge">Java POO</div>
        <h1>Introduction a Java</h1>
        <p class="objectives">- Comprendre l'écosystème Java : Être capable d'expliquer le fonctionnement de la plateforme Java, notamment la distinction entre le JDK, le JRE et la Machine Virtuelle Java (JVM), ainsi que le principe de portabilité ("Write Once, Run Anywhere").<br><br>- Prendre en main les outils de développement : Savoir installer et configurer un environnement de développement intégré (IDE comme IntelliJ IDEA ou Eclipse) pour créer, compiler, déboguer et exécuter un programme Java de base.<br><br>- Maîtriser la syntaxe de base et le typage fort : Être capable de manipuler correctement les types de données primitifs (int, double, boolean, etc.), de déclarer des variables et d'utiliser les opérateurs arithmétiques et logiques propres à Java.<br><br>- Structurer la logique d'exécution : Savoir implémenter les structures de contrôle de flux (conditions if/else, switch et boucles while, do-while, for) pour contrôler le comportement du programme.<br><br>- Manipuler les structures de données simples : Apprendre à déclarer, initialiser et parcourir des tableaux unidimensionnels et multidimensionnels.<br><br>- Décomposer un programme en méthodes : Être capable de modulariser son code en créant des méthodes statiques, en gérant correctement les paramètres d'entrée (passage par valeur) et les valeurs de retour.<br><br>- S'initier aux premières classes fondamentales : Savoir manipuler des objets de base de l'API standard Java, en particulier la classe String pour la gestion des chaînes de caractères, et réaliser des entrées/sorties simples sur la console (via Scanner et System.out.println).<br><br>- Adopter les bonnes pratiques de codage : Intégrer dès le départ les conventions de nommage Java (CamelCase), savoir documenter son code avec des commentaires clairs et interpréter les erreurs de compilation courantes.</p>
        <p class="meta">Java POO · DSI-2-B-Magreb · 20/09/2026</p>
      </section>
      <section style="top: 0px; display: block;" hidden="" aria-hidden="true" class="future"><figure style="background-color:default;text-align:center"><img src="https://res.cloudinary.com/qvrcqxpr/image/upload/v1783435299/teac/jusvfjy7vdjpmcsw0upo.png" alt=""></figure><p style="background-color:default">Java est un langage de programmation de haut niveau, orienté objet, au typage fort et statique, créé par Sun Microsystems (aujourd'hui détenu par Oracle) et lancé en 1995.</p><p style="background-color:default"></p></section>
    </div>
  <div class="backgrounds"><div class="slide-background title-slide present" data-loaded="true" style="display: block;"><div class="slide-background-content"></div></div><div class="slide-background future" data-loaded="true" style="display: block;"><div class="slide-background-content"></div></div></div><div class="slide-number" style="display: block;"><a href="#/">
					<span class="slide-number-a">1</span>
					</a></div><aside class="controls" data-controls-layout="bottom-right" data-controls-back-arrows="faded" style="display: block;"><button class="navigate-left" aria-label="previous slide" disabled="disabled"><div class="controls-arrow"></div></button>
			<button class="navigate-right enabled highlight" aria-label="next slide"><div class="controls-arrow"></div></button>
			<button class="navigate-up" aria-label="above slide" disabled="disabled"><div class="controls-arrow"></div></button>
			<button class="navigate-down" aria-label="below slide" disabled="disabled"><div class="controls-arrow"></div></button></aside><div class="progress" style="display: block;"><span style="transform: scaleX(0);"></span></div><div class="speaker-notes" data-prevent-swipe="" tabindex="0"></div><div class="pause-overlay"><button class="resume-button">Resume presentation</button></div><div class="aria-status" aria-live="polite" aria-atomic="true" style="position: absolute; height: 1px; width: 1px; overflow: hidden; clip: rect(1px, 1px, 1px, 1px);">Java POO Introduction a Java - Comprendre l'écosystème Java : Être capable d'expliquer le fonctionnement de la plateforme Java, notamment la distinction entre le JDK, le JRE et la Machine Virtuelle Java (JVM), ainsi que le principe de portabilité ("Write Once, Run Anywhere"). - Prendre en main les outils de développement : Savoir installer et configurer un environnement de développement intégré (IDE comme IntelliJ IDEA ou Eclipse) pour créer, compiler, déboguer et exécuter un programme Java de base. - Maîtriser la syntaxe de base et le typage fort : Être capable de manipuler correctement les types de données primitifs (int, double, boolean, etc.), de déclarer des variables et d'utiliser les opérateurs arithmétiques et logiques propres à Java. - Structurer la logique d'exécution : Savoir implémenter les structures de contrôle de flux (conditions if/else, switch et boucles while, do-while, for) pour contrôler le comportement du programme. - Manipuler les structures de données simples : Apprendre à déclarer, initialiser et parcourir des tableaux unidimensionnels et multidimensionnels. - Décomposer un programme en méthodes : Être capable de modulariser son code en créant des méthodes statiques, en gérant correctement les paramètres d'entrée (passage par valeur) et les valeurs de retour. - S'initier aux premières classes fondamentales : Savoir manipuler des objets de base de l'API standard Java, en particulier la classe String pour la gestion des chaînes de caractères, et réaliser des entrées/sorties simples sur la console (via Scanner et System.out.println). - Adopter les bonnes pratiques de codage : Intégrer dès le départ les conventions de nommage Java (CamelCase), savoir documenter son code avec des commentaires clairs et interpréter les erreurs de compilation courantes. Java POO · DSI-2-B-Magreb · 20/09/2026 </div></div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/common.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      controls: true,
      progress: true,
      slideNumber: true,
      transition: "slide"
    }).then(function () {
      if (window.hljs) window.hljs.highlightAll();
    });
    mermaid.initialize({ startOnLoad: true, securityLevel: 'loose' });
  </script>

</body></html>
