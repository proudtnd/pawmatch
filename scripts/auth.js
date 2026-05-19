/* ============================================================
   PawMatch — Shared auth module
   Injects: auth modal, "Sign in" button, "For Breeders" pill
   Works on all pages. Picks up active language via localStorage.
   ============================================================ */
(function(){
  'use strict';

  /* ===== i18n ===== */
  const STR = {
    en: {
      signinTitle:'Welcome back',
      signinSub:'Sign in to save pets, track inquiries, and pick up where you left off.',
      email:'Email', password:'Password', name:'Your name',
      signinBtn:'Sign in', continueBtn:'Continue',
      forgot:'Forgot password?', orContinue:'or continue with',
      noAccount:"Don't have an account?", signup:'Sign up',
      signupTitle:'Create your account',
      signupSub:'Join 8,900+ families who found their match.',
      haveAccount:'Already have an account?', signinLink:'Sign in',
      agreed:'By signing up, you agree to our Terms and Privacy Policy.',
      roleTitle:'What brings you to PawMatch?',
      roleSub:"We'll customize your experience for you.",
      roleSeeker:"I'm looking for a pet",
      roleSeekerDesc:'Browse pets, take the AI quiz, and connect with verified breeders.',
      roleBreeder:"I'm a breeder or farm",
      roleBreederDesc:'List pets, manage pedigree records, and reach trusted families. Verification required.',
      successTitle:'Welcome to PawMatch!',
      successSeeker:"Your account is ready. Let's go find your match.",
      successBreeder:"Application received. Our team will reach out within 48 hours to begin verification.",
      done:'Done', exploreCta:'Take the AI Quiz',
      breederBannerTitle:'Apply as a verified breeder',
      breederBannerSub:'Every breeder passes a 38-point audit — facilities, lineage, vet records, and ethics. Re-audited annually.',
      signinNav:'Sign in', breedersNav:'For Breeders',
      googleBtn:'Continue with Google', lineBtn:'Continue with LINE',
      myAccount:'My account', signout:'Sign out',
    },
    th: {
      signinTitle:'ยินดีต้อนรับกลับ',
      signinSub:'เข้าสู่ระบบเพื่อบันทึกสัตว์เลี้ยง ติดตามการสอบถาม และทำต่อจากที่ค้างไว้',
      email:'อีเมล', password:'รหัสผ่าน', name:'ชื่อของคุณ',
      signinBtn:'เข้าสู่ระบบ', continueBtn:'ต่อไป',
      forgot:'ลืมรหัสผ่าน?', orContinue:'หรือเข้าด้วย',
      noAccount:'ยังไม่มีบัญชี?', signup:'สมัครสมาชิก',
      signupTitle:'สร้างบัญชีของคุณ',
      signupSub:'เข้าร่วม 8,900+ ครอบครัวที่หาคู่ของพวกเขาเจอ',
      haveAccount:'มีบัญชีอยู่แล้ว?', signinLink:'เข้าสู่ระบบ',
      agreed:'การสมัครสมาชิก หมายความว่าคุณยอมรับข้อตกลงและนโยบายความเป็นส่วนตัวของเรา',
      roleTitle:'อะไรพาคุณมา PawMatch?',
      roleSub:'เราจะปรับแต่งประสบการณ์ให้คุณ',
      roleSeeker:'ฉันกำลังหาสัตว์เลี้ยง',
      roleSeekerDesc:'ดูสัตว์เลี้ยง ทำแบบทดสอบ AI และเชื่อมต่อกับฟาร์มที่รับรอง',
      roleBreeder:'ฉันเป็นฟาร์ม / ผู้เพาะ',
      roleBreederDesc:'ลงประกาศสัตว์เลี้ยง จัดการพันธุ์ประวัติ และเข้าถึงครอบครัวที่ไว้ใจได้ ต้องผ่านการรับรอง',
      successTitle:'ยินดีต้อนรับสู่ PawMatch!',
      successSeeker:'บัญชีของคุณพร้อมแล้ว มาหาคู่ของคุณกัน',
      successBreeder:'รับใบสมัครแล้ว ทีมเราจะติดต่อกลับภายใน 48 ชั่วโมงเพื่อเริ่มการรับรอง',
      done:'เรียบร้อย', exploreCta:'ทำแบบทดสอบ AI',
      breederBannerTitle:'สมัครเป็นฟาร์มที่รับรอง',
      breederBannerSub:'ทุกฟาร์มผ่านการตรวจสอบ 38 หัวข้อ — สถานที่ สายพันธุ์ ประวัติสัตวแพทย์ และจริยธรรม ตรวจสอบใหม่ทุกปี',
      signinNav:'เข้าสู่ระบบ', breedersNav:'สำหรับฟาร์ม',
      googleBtn:'เข้าด้วย Google', lineBtn:'เข้าด้วย LINE',
      myAccount:'บัญชีของฉัน', signout:'ออกจากระบบ',
    }
  };

  const getLang = () => localStorage.getItem('pm-lang') || 'en';
  const t = (k) => (STR[getLang()] && STR[getLang()][k]) ?? STR.en[k] ?? k;

  /* ===== Inject modal CSS ===== */
  const style = document.createElement('style');
  style.textContent = `
    #pm-auth { font-family: 'Inter', 'IBM Plex Sans Thai', system-ui, sans-serif; }
    html[lang="th"] #pm-auth { font-family: 'IBM Plex Sans Thai', 'Sarabun', system-ui, sans-serif; }
    #pm-auth .auth-step { display: none; }
    #pm-auth .auth-step.active { display: block; animation: pm-fade .25s ease-out; }
    @keyframes pm-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    #pm-auth input:focus { box-shadow: 0 0 0 3px rgba(31,58,44,0.12); }
    #pm-auth .role-card[aria-pressed="true"] { border-color: #1F3A2C; background: #F6EFE4; }
    @media (max-width: 640px) { #pm-auth .auth-sheet { max-height: 92dvh; overflow-y: auto; } }
  `;
  document.head.appendChild(style);

  /* ===== Modal markup ===== */
  const modalHTML = `
<div id="pm-auth" class="fixed inset-0 z-[60] hidden">
  <div class="absolute inset-0 bg-[#0E1F18]/75 backdrop-blur-sm" data-auth-close></div>
  <div class="relative h-full overflow-y-auto">
    <div class="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div class="auth-sheet bg-[#FBF7F1] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative">
        <button class="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#F6EFE4] hover:bg-[#EFE3CE] flex items-center justify-center z-10" data-auth-close aria-label="Close">
          <svg class="w-5 h-5 text-[#3B342D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>

        <!-- BREEDER BANNER -->
        <div data-banner class="hidden bg-gradient-to-br from-[#C2674A] to-[#A04E36] text-[#FBF7F1] px-7 py-5">
          <div class="flex items-start gap-3">
            <div class="text-2xl">🌾</div>
            <div>
              <div class="font-semibold text-base" data-tk="breederBannerTitle">Apply as a verified breeder</div>
              <div class="text-xs opacity-90 mt-1" data-tk="breederBannerSub">Every breeder passes a 38-point audit...</div>
            </div>
          </div>
        </div>

        <!-- ===== SIGN IN ===== -->
        <div class="auth-step active p-6 sm:p-8" data-step="signin">
          <div class="text-center">
            <div class="inline-flex w-12 h-12 rounded-2xl bg-[#F6EFE4] border border-[#E5D2B0] items-center justify-center mb-3 shadow-md">
              <svg viewBox="0 0 64 64" class="w-8 h-8">
                <g fill="#1F3A2C"><ellipse cx="11" cy="26" rx="5" ry="7" transform="rotate(-22 11 26)"/><ellipse cx="23" cy="16" rx="5.5" ry="8" transform="rotate(-8 23 16)"/><ellipse cx="41" cy="16" rx="5.5" ry="8" transform="rotate(8 41 16)"/><ellipse cx="53" cy="26" rx="5" ry="7" transform="rotate(22 53 26)"/></g>
                <path d="M 32 38 C 28 30, 13 30, 13 41 C 13 50, 26 56, 32 60 C 38 56, 51 50, 51 41 C 51 30, 36 30, 32 38 Z" fill="#C2674A"/>
              </svg>
            </div>
            <h3 style="font-family:'Inter',system-ui,sans-serif;font-weight:800;letter-spacing:-0.018em" class="text-2xl text-[#15291F]" data-tk="signinTitle">Welcome back</h3>
            <p class="text-sm text-[#3B342D] mt-1.5" data-tk="signinSub">Sign in to save pets...</p>
          </div>
          <form class="mt-5 space-y-3" data-form="signin">
            <label class="block">
              <span class="text-xs font-semibold text-[#3B342D]" data-tk="email">Email</span>
              <input type="email" required class="mt-1 w-full bg-[#F6EFE4] border border-[#E5D2B0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1F3A2C]" placeholder="you@example.com">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-[#3B342D]" data-tk="password">Password</span>
              <input type="password" required minlength="6" class="mt-1 w-full bg-[#F6EFE4] border border-[#E5D2B0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1F3A2C]" placeholder="••••••••">
            </label>
            <button type="submit" class="w-full bg-[#1F3A2C] hover:bg-[#15291F] text-[#FBF7F1] font-semibold py-3 rounded-full transition" data-tk="signinBtn">Sign in</button>
            <button type="button" class="block mx-auto text-xs text-[#A04E36] hover:underline" data-tk="forgot">Forgot password?</button>
          </form>
          <div class="my-5 flex items-center gap-3 text-xs text-[#8E8479]">
            <div class="flex-1 h-px bg-[#E5D2B0]"></div>
            <span data-tk="orContinue">or continue with</span>
            <div class="flex-1 h-px bg-[#E5D2B0]"></div>
          </div>
          <div class="grid gap-2">
            <button class="flex items-center justify-center gap-3 bg-white border border-[#E5D2B0] hover:border-[#1F3A2C] rounded-xl py-3 text-sm font-semibold text-[#1A1714] transition" data-oauth="google">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z"/><path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 015.5 12c0-.72.12-1.43.34-2.09V7.07H2.18A10.99 10.99 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              <span data-tk="googleBtn">Continue with Google</span>
            </button>
            <button class="flex items-center justify-center gap-3 bg-[#06C755] hover:bg-[#05B14C] text-white rounded-xl py-3 text-sm font-semibold transition" data-oauth="line">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 5.7 2 10.2c0 4 3.7 7.4 8.6 8.1.3.1.8.2.9.5.1.3.1.7 0 1l-.2 1.4c-.1.4-.3 1.6 1.4.9 1.7-.7 9-5.3 9-10.6C22 5.7 17.5 2 12 2zM8 13H6c-.2 0-.4-.2-.4-.4V8.7c0-.2.2-.4.4-.4s.4.2.4.4v3.5H8c.2 0 .4.2.4.4s-.2.4-.4.4zm1.6-.4c0 .2-.2.4-.4.4s-.4-.2-.4-.4V8.7c0-.2.2-.4.4-.4s.4.2.4.4v3.9zm5 0c0 .2-.1.3-.3.4h-.1c-.1 0-.2 0-.3-.1l-2-2.7v2.4c0 .2-.2.4-.4.4s-.4-.2-.4-.4V8.7c0-.2.1-.3.3-.4h.1c.1 0 .2.1.3.2l2 2.7V8.7c0-.2.2-.4.4-.4s.4.2.4.4v3.9zm3.4-2.4c.2 0 .4.2.4.4s-.2.4-.4.4h-1.6v1h1.6c.2 0 .4.2.4.4s-.2.4-.4.4H16c-.2 0-.4-.2-.4-.4V8.7c0-.2.2-.4.4-.4h2c.2 0 .4.2.4.4s-.2.4-.4.4h-1.6v1H18z"/></svg>
              <span data-tk="lineBtn">Continue with LINE</span>
            </button>
          </div>
          <div class="mt-5 text-center text-xs text-[#3B342D]">
            <span data-tk="noAccount">Don't have an account?</span>
            <button class="ml-1 font-semibold text-[#1F3A2C] hover:underline" data-go="signup" data-tk="signup">Sign up</button>
          </div>
        </div>

        <!-- ===== SIGN UP ===== -->
        <div class="auth-step p-6 sm:p-8" data-step="signup">
          <div class="text-center">
            <div class="text-3xl mb-2">✨</div>
            <h3 style="font-family:'Fraunces',Georgia,serif" class="text-2xl font-semibold text-[#15291F]" data-tk="signupTitle">Create your account</h3>
            <p class="text-sm text-[#3B342D] mt-1.5" data-tk="signupSub">Join 8,900+ families...</p>
          </div>
          <form class="mt-5 space-y-3" data-form="signup">
            <label class="block">
              <span class="text-xs font-semibold text-[#3B342D]" data-tk="name">Your name</span>
              <input type="text" required class="mt-1 w-full bg-[#F6EFE4] border border-[#E5D2B0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1F3A2C]">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-[#3B342D]" data-tk="email">Email</span>
              <input type="email" required class="mt-1 w-full bg-[#F6EFE4] border border-[#E5D2B0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1F3A2C]" placeholder="you@example.com">
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-[#3B342D]" data-tk="password">Password</span>
              <input type="password" required minlength="6" class="mt-1 w-full bg-[#F6EFE4] border border-[#E5D2B0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1F3A2C]" placeholder="At least 6 characters">
            </label>
            <button type="submit" class="w-full bg-[#1F3A2C] hover:bg-[#15291F] text-[#FBF7F1] font-semibold py-3 rounded-full transition" data-tk="continueBtn">Continue</button>
            <p class="text-[11px] text-[#8E8479] text-center" data-tk="agreed">By signing up, you agree to our Terms and Privacy Policy.</p>
          </form>
          <div class="mt-4 text-center text-xs text-[#3B342D]">
            <span data-tk="haveAccount">Already have an account?</span>
            <button class="ml-1 font-semibold text-[#1F3A2C] hover:underline" data-go="signin" data-tk="signinLink">Sign in</button>
          </div>
        </div>

        <!-- ===== ROLE PICKER ===== -->
        <div class="auth-step p-6 sm:p-8" data-step="role">
          <div class="text-center">
            <div class="text-4xl mb-2">🐾</div>
            <h3 style="font-family:'Fraunces',Georgia,serif" class="text-2xl font-semibold text-[#15291F]" data-tk="roleTitle">What brings you to PawMatch?</h3>
            <p class="text-sm text-[#3B342D] mt-1.5" data-tk="roleSub">We'll customize your experience.</p>
          </div>
          <div class="mt-6 space-y-3">
            <button class="role-card w-full text-left bg-[#F6EFE4] hover:bg-[#EFE3CE] border-2 border-[#E5D2B0] hover:border-[#1F3A2C] rounded-2xl p-5 transition flex items-start gap-4" data-role="seeker">
              <div class="w-12 h-12 rounded-xl bg-[#1F3A2C] text-[#FBF7F1] flex items-center justify-center text-xl shrink-0">🏡</div>
              <div class="min-w-0">
                <div style="font-family:'Fraunces',Georgia,serif" class="text-lg font-semibold text-[#15291F]" data-tk="roleSeeker">I'm looking for a pet</div>
                <div class="text-xs text-[#3B342D] mt-0.5" data-tk="roleSeekerDesc">Browse pets, take the AI quiz, and connect with verified breeders.</div>
              </div>
            </button>
            <button class="role-card w-full text-left bg-[#F6EFE4] hover:bg-[#EFE3CE] border-2 border-[#E5D2B0] hover:border-[#1F3A2C] rounded-2xl p-5 transition flex items-start gap-4" data-role="breeder">
              <div class="w-12 h-12 rounded-xl bg-[#C2674A] text-[#FBF7F1] flex items-center justify-center text-xl shrink-0">🌾</div>
              <div class="min-w-0">
                <div style="font-family:'Fraunces',Georgia,serif" class="text-lg font-semibold text-[#15291F]" data-tk="roleBreeder">I'm a breeder or farm</div>
                <div class="text-xs text-[#3B342D] mt-0.5" data-tk="roleBreederDesc">List pets, manage pedigree records, and reach trusted families.</div>
              </div>
            </button>
          </div>
        </div>

        <!-- ===== SUCCESS ===== -->
        <div class="auth-step p-6 sm:p-8 text-center" data-step="success">
          <div class="text-6xl mb-3">🎉</div>
          <h3 style="font-family:'Fraunces',Georgia,serif" class="text-2xl font-semibold text-[#15291F]" data-tk="successTitle">Welcome to PawMatch!</h3>
          <p class="text-sm text-[#3B342D] mt-2" id="pm-success-msg">Your account is ready.</p>
          <div class="mt-6 grid gap-2">
            <a href="index.html#match" class="bg-[#1F3A2C] hover:bg-[#15291F] text-[#FBF7F1] font-semibold py-3 rounded-full text-sm transition" data-tk="exploreCta" id="pm-explore-cta">Take the AI Quiz</a>
            <button class="bg-[#F6EFE4] hover:bg-[#EFE3CE] text-[#15291F] font-semibold py-3 rounded-full text-sm transition" data-auth-close data-tk="done">Done</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  /* ===== Translation refresh ===== */
  function applyTranslations(){
    document.querySelectorAll('[data-tk]').forEach(el => {
      el.textContent = t(el.getAttribute('data-tk'));
    });
    document.querySelectorAll('[data-tk-nav]').forEach(el => {
      el.textContent = t(el.getAttribute('data-tk-nav'));
    });
    // Existing Sign in label if present
    document.querySelectorAll('[data-i18n="nav.signin"]').forEach(el => {
      if(!el.querySelector('[data-tk-nav]')) el.textContent = t('signinNav');
    });
  }

  /* ===== Step navigation ===== */
  const root = document.getElementById('pm-auth');
  function goStep(step){
    root.querySelectorAll('.auth-step').forEach(s => s.classList.toggle('active', s.dataset.step === step));
  }
  function showBanner(show){
    const b = root.querySelector('[data-banner]');
    if(b) b.classList.toggle('hidden', !show);
  }

  /* ===== Open / close ===== */
  function open(intent){
    applyTranslations();
    root.dataset.intent = (intent === 'breeder') ? 'breeder' : '';
    if(intent === 'breeder'){
      showBanner(true);
      goStep('signup');
    } else {
      showBanner(false);
      goStep(intent === 'signup' ? 'signup' : 'signin');
    }
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    root.classList.add('hidden');
    document.body.style.overflow = '';
  }
  function showSuccess(role){
    const msg = role === 'breeder' ? t('successBreeder') : t('successSeeker');
    document.getElementById('pm-success-msg').textContent = msg;
    // Hide AI quiz CTA for breeders, show breeders dashboard hint instead
    const cta = document.getElementById('pm-explore-cta');
    if(role === 'breeder'){
      cta.textContent = (getLang()==='th') ? 'ดูแดชบอร์ดฟาร์ม' : 'Go to breeder dashboard';
      cta.setAttribute('href', '#');
    } else {
      cta.textContent = t('exploreCta');
      cta.setAttribute('href', 'index.html#match');
    }
    goStep('success');
    // Persist
    localStorage.setItem('pm-role', role);
    localStorage.setItem('pm-user', JSON.stringify({ name:'Friend', role, signedIn:true, at:Date.now() }));
    refreshSignedInUI();
  }

  /* ===== Event delegation ===== */
  document.addEventListener('click', e => {
    if(e.target.closest('[data-auth-close]')) { close(); return; }
    const openBtn = e.target.closest('[data-auth-open]');
    if(openBtn){
      e.preventDefault();
      open(openBtn.dataset.authOpen);
      return;
    }
    const goBtn = e.target.closest('[data-go]');
    if(goBtn && goBtn.closest('#pm-auth')){
      goStep(goBtn.dataset.go);
      return;
    }
    const oauth = e.target.closest('[data-oauth]');
    if(oauth){
      if(window.PawDB && oauth.dataset.oauth === 'google'){
        // Real Google OAuth — page will redirect
        const intent = root.dataset.intent || '';
        if(intent) localStorage.setItem('pm-pending-intent', intent);
        window.PawDB.signInWithGoogle(intent);
        return;
      }
      // Mock for LINE / fallback
      if(root.dataset.intent === 'breeder'){ showSuccess('breeder'); }
      else if(localStorage.getItem('pm-role')){ showSuccess(localStorage.getItem('pm-role')); }
      else { goStep('role'); }
      return;
    }
    const roleBtn = e.target.closest('[data-role]');
    if(roleBtn && roleBtn.closest('#pm-auth')){
      const role = roleBtn.dataset.role;
      if(window.PawDB){
        window.PawDB.updateProfile({ role }).catch(()=>{});
      }
      showSuccess(role);
      return;
    }
  });

  /* ===== Inline error helper ===== */
  function setFormError(form, msg){
    let bar = form.querySelector('[data-error]');
    if(!bar){
      bar = document.createElement('div');
      bar.setAttribute('data-error','');
      bar.className = 'mt-3 text-sm text-[#A04E36] bg-[#F2D9CF] border border-[#D88A6A] rounded-xl px-3 py-2';
      form.appendChild(bar);
    }
    bar.textContent = msg;
    bar.style.display = msg ? 'block' : 'none';
  }
  function setFormBusy(form, busy){
    const btn = form.querySelector('button[type="submit"]');
    if(btn){ btn.disabled = !!busy; btn.style.opacity = busy ? 0.6 : 1; }
  }

  /* ===== Form submits ===== */
  root.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      setFormError(form, '');
      const which = form.dataset.form;
      const inputs = form.querySelectorAll('input');

      // Use real Supabase auth if loaded
      if(window.PawDB){
        setFormBusy(form, true);
        try {
          if(which === 'signin'){
            const email = inputs[0].value.trim();
            const password = inputs[1].value;
            const { error } = await window.PawDB.signInWithEmail(email, password);
            if(error){ setFormError(form, error.message); setFormBusy(form, false); return; }
            const user = await window.PawDB.getCurrentUser();
            showSuccess(user?.profile?.role || 'seeker');
          } else {
            const fullName = inputs[0].value.trim();
            const email = inputs[1].value.trim();
            const password = inputs[2].value;
            const intendedRole = root.dataset.intent === 'breeder' ? 'breeder' : 'seeker';
            const { error } = await window.PawDB.signUpWithEmail(email, password, fullName, intendedRole);
            if(error){ setFormError(form, error.message); setFormBusy(form, false); return; }
            if(root.dataset.intent === 'breeder'){
              showSuccess('breeder');
            } else {
              goStep('role');
            }
          }
        } catch(err){
          setFormError(form, err.message || 'Something went wrong');
        } finally {
          setFormBusy(form, false);
        }
        return;
      }

      // Fallback (Supabase not loaded)
      if(which === 'signin'){
        showSuccess(localStorage.getItem('pm-role') || 'seeker');
      } else if(root.dataset.intent === 'breeder'){
        showSuccess('breeder');
      } else {
        goStep('role');
      }
    });
  });

  /* ===== Inject nav: Sign in + For Breeders ===== */
  function injectNavElements(){
    document.querySelectorAll('header').forEach(header => {
      const anyLang = header.querySelector('.lang-btn');
      if(!anyLang) return;
      const langWrap = anyLang.parentElement;
      const navContainer = langWrap.parentElement;
      if(!navContainer) return;

      // For Breeders pill (insert before lang toggle)
      if(!navContainer.querySelector('[data-pm-breeders]')){
        const pill = document.createElement('a');
        pill.href = '#';
        pill.dataset.pmBreeders = '1';
        pill.dataset.authOpen = 'breeder';
        pill.className = 'hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-[#7E3B28] hover:text-[#A04E36] bg-[#F6EFE4] hover:bg-[#EFE3CE] border border-[#E5D2B0] hover:border-[#D88A6A] rounded-full px-3 py-1.5 transition';
        pill.innerHTML = '<span>🌾</span> <span data-tk-nav="breedersNav">For Breeders</span>';
        navContainer.insertBefore(pill, langWrap);
      }

      // Sign in (use existing or inject)
      let signin = navContainer.querySelector('[data-i18n="nav.signin"]');
      if(!signin){
        signin = document.createElement('button');
        signin.className = 'hidden sm:inline-flex text-sm font-medium text-[#3B342D] hover:text-[#15291F] px-3 py-2';
        signin.setAttribute('data-pm-signin','1');
        signin.dataset.authOpen = 'signin';
        signin.innerHTML = '<span data-tk-nav="signinNav">Sign in</span>';
        langWrap.insertAdjacentElement('afterend', signin);
      } else {
        signin.dataset.authOpen = 'signin';
      }
    });

    // Mobile drawer
    document.querySelectorAll('#mnav-panel').forEach(panel => {
      const grid = panel.querySelector('.grid');
      if(!grid || grid.querySelector('[data-pm-mobile-signin]')) return;
      const sep = document.createElement('div');
      sep.className = 'border-t border-[#EFE3CE] my-1';
      grid.appendChild(sep);

      const signinMobile = document.createElement('a');
      signinMobile.href = '#';
      signinMobile.dataset.pmMobileSignin = '1';
      signinMobile.dataset.authOpen = 'signin';
      signinMobile.className = 'py-2 font-semibold text-[#15291F]';
      signinMobile.innerHTML = '<span data-tk-nav="signinNav">Sign in</span>';
      grid.appendChild(signinMobile);

      const breederMobile = document.createElement('a');
      breederMobile.href = '#';
      breederMobile.dataset.authOpen = 'breeder';
      breederMobile.className = 'py-2 text-[#7E3B28]';
      breederMobile.innerHTML = '🌾 <span data-tk-nav="breedersNav">For Breeders</span>';
      grid.appendChild(breederMobile);
    });
  }
  injectNavElements();

  /* ===== Signed-in state UI ===== */
  function refreshSignedInUI(){
    const userRaw = localStorage.getItem('pm-user');
    if(!userRaw) return;
    let user; try{ user = JSON.parse(userRaw); }catch{ return; }
    if(!user || !user.signedIn) return;
    // Replace Sign in buttons with avatar/menu
    document.querySelectorAll('[data-i18n="nav.signin"], [data-pm-signin], [data-pm-mobile-signin]').forEach(el => {
      if(el.dataset.pmReplaced) return;
      el.dataset.pmReplaced = '1';
      const isMobile = el.dataset.pmMobileSignin === '1';
      if(isMobile){
        el.innerHTML = '👋 <span>' + t('myAccount') + '</span>';
      } else {
        const initials = (user.name||'•').slice(0,1).toUpperCase();
        el.innerHTML = '<span class="inline-flex items-center gap-2"><span class="w-7 h-7 rounded-full bg-[#1F3A2C] text-[#FBF7F1] text-xs font-semibold flex items-center justify-center">'+initials+'</span><span class="hidden md:inline">'+(user.role==='breeder'?'🌾':'🏡')+' '+t('myAccount')+'</span></span>';
        el.className = 'inline-flex items-center text-sm font-medium text-[#3B342D] hover:text-[#15291F] px-2 py-1';
      }
    });
  }
  refreshSignedInUI();

  /* ===== Re-apply translations on language change ===== */
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => {
      setTimeout(()=>{ applyTranslations(); refreshSignedInUI(); }, 30);
    });
  });

  applyTranslations();

  /* ===== Listen for Supabase auth events ===== */
  window.addEventListener('pm:auth', async (e) => {
    if(e.detail.event === 'SIGNED_IN' && window.PawDB){
      const user = await window.PawDB.getCurrentUser();
      if(user){
        localStorage.setItem('pm-user', JSON.stringify({
          name: user.profile?.full_name || user.email?.split('@')[0],
          role: user.profile?.role || 'seeker',
          email: user.email,
          signedIn: true,
        }));
        if(user.profile?.role) localStorage.setItem('pm-role', user.profile.role);
        refreshSignedInUI();

        // If we just returned from OAuth with a pending intent, finish flow
        const pendingIntent = localStorage.getItem('pm-pending-intent');
        if(pendingIntent){
          localStorage.removeItem('pm-pending-intent');
          if(pendingIntent === 'breeder'){
            await window.PawDB.updateProfile({ role: 'breeder' }).catch(()=>{});
            open('signin'); // open modal so success can render
            showSuccess('breeder');
          } else if(!user.profile?.role || user.profile.role === 'seeker'){
            open('signin');
            goStep('role');
          }
        }
      }
    } else if(e.detail.event === 'SIGNED_OUT'){
      localStorage.removeItem('pm-user');
      location.reload();
    }
  });

  /* Expose tiny API */
  window.PawAuth = {
    open, close,
    async signOut(){
      if(window.PawDB) await window.PawDB.signOut();
      localStorage.removeItem('pm-user');
      location.reload();
    }
  };
})();
