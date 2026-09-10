/* MIDDLEWARE — site.js
   One dictionary, one toggle, one motion. No request leaves this page.
   Arabic is the document; English is the toggle (BRIEF §4, §6). */
(function () {
  'use strict';

  var WA = 'https://wa.me/963953250111?text=';

  /* Figures inside the finding names — written by site/reading/build.py from
     site/reading/figures.json, the same file that renders the two pages. Never
     type a number here by hand. */
  var FIG = /*FIG*/{"f1n": "820", "f2n": "40", "f4n": "134", "f4o": "$31,000"}/*/FIG*/;

  /* The 60-second recording of the phone (BRIEF §9). Until the file exists
     the play control stays hidden and the still stands alone. */
  var VIDEO = null; // 'video/phone-60s.mp4'

  var T = {
    ar: {
      toggle: 'عربي', toggleName: 'العربية',
      title: 'MIDDLEWARE — برنامج المحاسبة عندك بيعرف كل شي عن شركتك. وإنت ما عم تشوف منو ولا شي.',
      desc: 'ما منغيّر شي ببرنامج المحاسبة. بس فجأة بتصير شايف — عكل تلفون بالمحل، كل ساعة. 20 دقيقة عالتلفون، 3 ملفات، ورقتين عن شركتك. دمشق.',
      sentence: 'برنامج المحاسبة عندك بيعرف كل شي عن شركتك. وإنت ما عم تشوف منو ولا شي.',
      answer: 'ما منغيّر شي. بس فجأة بتصير شايف.',
      btn: '<span class="n">20</span> دقيقة عالتلفون',
      btnShort: '<span class="n">20</span> دقيقة',
      msg: 'مرحبا، شفت الموقع. بدي أحكي معكن ٢٠ دقيقة عن شغلي.',
      'hero.alt': 'مكتب تجاري قديم بالشام وقت الغروب: دفتر ورقي مفتوح، وتلفون عليه بيعرض مستودع',
      'reading.eb': 'القراءة',
      'reading.h': 'ورقتين عن شركتك — أرقام ما حدا حطّها جنب بعضها قبل.',
      'reading.cap': 'قراءة لموزّع بالشام. الأسامي مشالة والأرقام مدوّرة — بس كل رقم من ملفاتو هو.',
      'reading.alt': 'ورقتين القراءة: خمس نتائج من ملفات موزّع بالشام، الأسامي مشالة والأرقام مدوّرة',
      f1: 'رأسمال نايم بـ <span class="n">{f1n}</span> صنف ما انباعوا ولا مرة هالسنة',
      f2: 'مبيع شهري محمي بـ <span class="n">{f2n}</span> صنف تغطيتهن أقل من شهرين',
      f3: 'زبون اشتروا فوق <span class="n" dir="ltr">$2,000</span> السنة الماضية، وما اشتروا من أربع أشهر',
      f4: 'مستحقة عند <span class="n">{f4n}</span> زبون — منها <span class="n" dir="ltr">{f4o}</span> فوق التسعين يوم',
      f5: 'بند انباعوا بأقل من كلفتهن',
      'client.eb': 'أول زبون',
      'client.h': 'أول زبون كان شركة العيلة. لليوم شغّالة على يلي بنيناه.',
      'client.p': '<span class="lat">Lightware</span>، موزّع إنارة بالشام: كان ماشي عالورق وغروب واتساب، وصاحب الشغل ما عندو ولا رقم عتلفونو — مع إنو كل أرقامو موجودة بالأمين. ما غيّرنا البرنامج.',
      c1: 'صنف بدفتر واحد — صاروا عكل تلفون بالمحل',
      c2: 'صنف بصورة، قدّام الناس عالموقع',
      c3: 'شغّال كل يوم من تموز — كل ساعة، بلا ما يتغيّر شي بالأمين',
      'client.play': 'شغّل — 60 ثانية',
      'client.rec': '60 ثانية من التلفون. بدون صوت.',
      'client.stillCap': 'الدفتر والتلفون — المستودع عالشاشة، بأرقامو الحقيقية.',
      'client.stillAlt': 'التلفون على الدفتر، وعليه مستودع الموزّع',
      'how.eb': 'كيف بتبلّش',
      'how.h': '<span class="n">20</span> دقيقة. <span class="n">3</span> ملفات. ورقتين. <span class="dash">—</span> وللهلق ما دفعت ولا ليرة.',
      s1: '<span class="n">20</span> دقيقة عالتلفون. ما في عرض ولا برنامج — نحنا منسأل وإنت بتحكي.',
      s2: '<span class="n">3</span> ملفات من برنامجك — بتطلع بدقيقتين. بتضل عند شخص واحد، ما بتنشارك مع حدا، وبتنمسح إذا ما كمّلنا سوا. وورقة موقّعة بهالشي قبل ما تبعت أي ملف.',
      s3: 'ورقتين عن شركتك — منقراهن قدّامك عالطاولة. وبعدين أصنافك عتلفونك، بشعارك. وبعدين بس، السعر: تلات خيارات عورقة، وحدة منصحك فيها.',
      s4: 'لهلق ما دفعت ولا ليرة. بتدفع لما تختار.',
      'ledger.h': 'دفتر أول قعدة',
      l1: '<span class="n">20</span> دقيقة عالتلفون',
      l2: 'القراءة — ورقتين، عورق، عالطاولة',
      l3: 'شركتك عتلفونك، بشعارك',
      l4: 'العرض — تلات خيارات، وحدة منصحك فيها',
      l5: 'التنفيذ',
      l5v: 'الرقم عالورقة يلي بإيدك',
      refusal: 'إذا أرقامك ما فيها شي يستاهل، منقلّك عالتلفون ومنتركك بحالك. ما منلحّق حدا.',
      accountant: 'كلمة للمحاسب: دخولنا قراءة بس. وبتشوفها بعينك — منحاول نعدّل رقم قدّامك، وبيرفض. واحذفلنا الدخول وقت ما بدك، وكل شي بنيناه بيوقف. هيك مقصود.',
      'build.eb': 'شو منبني',
      'build.intro': 'منبني الأنظمة يلي الشركة بتمشي عليها وبتبيع من خلالها. ما منشتغل بالتسويق.',
      'p.system': 'النظام',
      'p.systemL': 'ما بيتغيّر شي ببرنامجك. بس بتصير شايف كل شي — عكل تلفون بالمحل، كل ساعة.',
      'p.morning': 'الصبح',
      'p.morningL': 'الشي يلي بدك تعرفو كل يوم الصبح — عتلفونك قبل ما توصل عالمحل.',
      'p.statement': 'كشف الحساب',
      'p.statementL': 'كشف حساب الزبون، بالصور، عالواتساب بثواني.',
      'p.floor': 'الصالة',
      'p.floorL': 'الورقة وغروب الواتساب بيصيروا طابور واحد نظيف عند يلي بيكتب الفواتير.',
      'p.catalogue': 'الكتالوج — والمتجر الأونلاين',
      'p.catalogueL': 'أصنافك قدّام الناس بصورة لكل واحد — والزبون بيبعتلك عالواتساب والأكواد جاهزة. وإذا بدك متجر أونلاين كامل، منبنيه من الصفر.',
      'p.profile': 'البروفايل',
      'p.profileL': 'شركتك متل ما بيشوفها زبون من برّا: الموقع، البروفايل، وعرض السعر بصورة عكل بند.',
      'p.exception': 'الاستثناء',
      'p.exceptionL': 'كل شركة عندها شي بيمشي «إلا لما…». منبنيلك ياه أداة إلك لحالك.',
      proof: 'شغّال كل يوم من تموز <span class="n">2026</span> على دفتر فيه <span class="n">2,800</span> صنف عند موزّع بالشام',
      'people.eb': 'شخصين',
      'people.h': 'شخصين. يلي بيحكي معك هو يلي بيبني. ومناخد عدد صغير من الزبائن بالسنة — عمداً.',
      samir: 'سمير القباني',
      samirL: 'بنى النظام يلي أول زبون لليوم شغّال عليه — وبيبني تبعك.',
      mazhar: 'مظهر شوربجي',
      mazharL: 'بيحكي معك من أول مكالمة، وبيقعد معك عالطاولة، وبيبني.',
      'people.n': 'شخصين يعني حوالي تمن زبائن بالسنة.',
      'people.wa': 'واتساب',
      foot: 'قبل أي ملف: ورقة موقّعة. — دمشق'
    },
    en: {
      toggle: 'EN', toggleName: 'English',
      title: 'MIDDLEWARE — Your accounting program knows everything about your business. You can’t see any of it.',
      desc: 'Nothing changes in your accounting program. Suddenly you can see all of it — on every phone in the building, refreshed every hour. Twenty minutes on the phone, three files, two pages about your business. Damascus.',
      sentence: 'Your accounting program knows everything about your business. You can’t see any of it.',
      answer: 'Nothing changes. Suddenly you can see.',
      btn: 'Twenty minutes on the phone',
      btnShort: 'Twenty minutes',
      msg: 'Hello, I saw the site. I’d like the twenty minutes about my business.',
      'hero.alt': 'An old trading office in Damascus at dusk: an open paper ledger, and a phone on it showing a warehouse',
      'reading.eb': 'The Reading',
      'reading.h': 'Two pages about your business — numbers nobody had put side by side before.',
      'reading.cap': 'A Damascus distributor’s Reading. Names removed, figures rounded — every number from his own files.',
      'reading.alt': 'The two pages of a Reading: five findings from a Damascus distributor’s files, names removed, figures rounded',
      f1: 'asleep in <span class="n">{f1n}</span> items that have not sold once this year',
      f2: 'of monthly sales protected by <span class="n">{f2n}</span> items with under two months of cover',
      f3: 'customers who each bought over <span class="n" dir="ltr">$2,000</span> last year and nothing in four months',
      f4: 'outstanding across <span class="n">{f4n}</span> customers — <span class="n" dir="ltr">{f4o}</span> of it over ninety days',
      f5: 'lines sold below what they cost',
      'client.eb': 'The first client',
      'client.h': 'Our first client was the family’s own business. It still runs on what we built.',
      'client.p': '<span class="lat">Lightware</span>, a lighting distributor in Damascus: it ran on paper and a WhatsApp group, and the owner had not one number on his phone — although every one of them was already in Al-Ameen. We did not change the program.',
      c1: 'items on one book — now on every phone in the building',
      c2: 'items with a photograph, public on the site',
      c3: 'running daily since July — every hour, with nothing changed in Al-Ameen',
      'client.play': 'Play — 60 seconds',
      'client.rec': '60 seconds of the phone. No sound.',
      'client.stillCap': 'The ledger and the phone — the warehouse on the screen, with its real numbers.',
      'client.stillAlt': 'The phone on the ledger, showing the distributor’s warehouse',
      'how.eb': 'How it starts',
      'how.h': 'Twenty minutes. Three files. Two pages. <span class="dash">—</span> And you have paid nothing.',
      s1: 'Twenty minutes on the phone. No presentation, no program — we ask, you talk.',
      s2: 'Three exports from your program — two minutes. They stay with one person, are shared with nobody, and are deleted if we don’t go ahead. A signed undertaking before you send a byte.',
      s3: 'Two pages about your business, read to you across the table. Then your own items on your own phone, with your logo. Then, and only then, a price — three options on paper, one recommended.',
      s4: 'You have paid nothing. You pay when you choose.',
      'ledger.h': 'The ledger of the first meeting',
      l1: 'Twenty minutes on the phone',
      l2: 'The Reading — two pages, on paper, in the room',
      l3: 'Your business on your phone, your logo on it',
      l4: 'The proposal — three options, one recommended',
      l5: 'The build',
      l5v: 'the number on the page in your hand',
      refusal: 'If your numbers don’t show us something worth fixing, we say so on the call and leave you alone. We don’t chase.',
      accountant: 'A word for the accountant: our login reads and cannot write. You will watch it fail — we try to change a figure in front of you, and it is refused. Delete the login whenever you like and everything we built stops. That is on purpose.',
      'build.eb': 'What we build',
      'build.intro': 'We build the systems a business runs on and sells through. We don’t run its marketing.',
      'p.system': 'The System',
      'p.systemL': 'Nothing changes in your accounting program. Suddenly you can see all of it — on every phone in the building, refreshed every hour.',
      'p.morning': 'The Morning',
      'p.morningL': 'The one thing you want to know every morning, on your phone before you reach the shop.',
      'p.statement': 'The Statement',
      'p.statementL': 'A customer’s account, with photographs, on WhatsApp in seconds.',
      'p.floor': 'The Floor',
      'p.floorL': 'Paper and the WhatsApp group become one clean queue for whoever types the bills.',
      'p.catalogue': 'The Catalogue — and the online store',
      'p.catalogueL': 'Your products, public, a photograph each — browsing becomes a WhatsApp enquiry with the codes attached. And when you need a full online store, we build it from the ground up.',
      'p.profile': 'The Profile',
      'p.profileL': 'The version of your company a buyer abroad sees: the site, the profile, the quotation with a photograph on every line.',
      'p.exception': 'The exception',
      'p.exceptionL': 'Every business has one thing that works “except when…”. We build that as a tool that belongs to you alone.',
      proof: 'running daily since July <span class="n">2026</span> on a <span class="n">2,800</span>-item book at a Damascus distributor',
      'people.eb': 'Two people',
      'people.h': 'Two people. The one you talk to is the one who builds. And we take a small number of clients a year — on purpose.',
      samir: 'Samir Alkabbani',
      samirL: 'Built the system the first client still runs on — and builds yours.',
      mazhar: 'Mazhar Chourbagi',
      mazharL: 'Talks to you from the first call, sits with you at the table, and builds.',
      'people.n': 'Two people is about eight clients a year.',
      'people.wa': 'WhatsApp',
      foot: 'Before any file: a signed undertaking. — Damascus'
    }
  };

  function tpl(s) { return s.replace(/\{(\w+)\}/g, function (m, k) { return k in FIG ? FIG[k] : '—'; }); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function apply(lang) {
    if (!T[lang]) lang = 'ar';
    var d = T[lang], h = document.documentElement;
    h.lang = lang;
    h.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = d.title;
    var md = document.querySelector('meta[name="description"]');
    if (md) md.content = d.desc;
    $$('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (k in d) el.textContent = d[k]; });
    $$('[data-i18n-html]').forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (k in d) el.innerHTML = tpl(d[k]); });
    $$('[data-i18n-alt]').forEach(function (el) { var k = el.getAttribute('data-i18n-alt'); if (k in d) el.alt = d[k]; });
    $$('[data-wa]').forEach(function (a) { a.href = WA + encodeURIComponent(d.msg); });
    var b = document.getElementById('lang'), other = lang === 'ar' ? 'en' : 'ar';
    if (b) { b.textContent = T[other].toggle; b.lang = other; b.setAttribute('aria-label', T[other].toggleName); b.title = T[other].toggleName; }
    try { localStorage.setItem('mw_lang', lang); } catch (e) {}
  }

  /* ---- the one motion: a figure counts up from zero the first time it enters view ---- */
  function fmt(v, dec) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function countUp() {
    var els = $$('[data-count]');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var live = [];
    els.forEach(function (el) {
      var v = parseFloat(el.getAttribute('data-value'));
      if (!isFinite(v)) { console.error('MIDDLEWARE: a figure is missing on the page —', el.parentElement && el.parentElement.parentElement); return; }
      var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
      el.textContent = pre + fmt(v, dec) + suf;
      live.push({ el: el, v: v, dec: dec, pre: pre, suf: suf });
    });
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var it = e.target.__mw; if (!it || it.done) return;
        it.done = true;
        var t0 = null, D = 900;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / D), k = 1 - Math.pow(1 - p, 3);
          it.el.textContent = it.pre + fmt(it.v * k, it.dec) + it.suf;
          if (p < 1) requestAnimationFrame(step); else it.el.textContent = it.pre + fmt(it.v, it.dec) + it.suf;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    live.forEach(function (it) { it.el.__mw = it; it.el.textContent = it.pre + fmt(0, it.dec) + it.suf; io.observe(it.el); });
  }

  /* ---- the header: transparent over the photograph, paper from block 2 down ---- */
  function header() {
    var hd = document.getElementById('hd'), end = document.getElementById('hero-end');
    if (!hd || !end) return;
    if (!('IntersectionObserver' in window)) { hd.classList.add('past'); return; }
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      hd.classList.toggle('past', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(end);
  }

  /* ---- the recording: click to play, no autoplay, no sound ---- */
  function recording() {
    var v = document.getElementById('recv'), p = document.getElementById('play');
    if (!v || !p || !VIDEO) return;
    var cap = document.querySelector('#rec figcaption');
    if (cap) { cap.setAttribute('data-i18n', 'client.rec'); apply(document.documentElement.lang); }
    p.hidden = false;
    p.addEventListener('click', function () {
      v.src = VIDEO; v.muted = true; v.controls = true; v.hidden = false; p.hidden = true;
      v.play().catch(function () {});
    });
  }

  var lang = 'ar';
  try { lang = localStorage.getItem('mw_lang') === 'en' ? 'en' : 'ar'; } catch (e) {}
  apply(lang);
  countUp();
  header();
  recording();
  var toggle = document.getElementById('lang');
  if (toggle) toggle.addEventListener('click', function () { apply(document.documentElement.lang === 'ar' ? 'en' : 'ar'); });
  window.__setLang = apply;   // the verification harness flips the language through this
})();
