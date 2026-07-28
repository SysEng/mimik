'use strict';

const E_PAGES = {
	home: 0,
	game: 1,
};

const E_AUDIOS = {
	countdown: 'countdown',
	play: 'play',
	ending: 'ending',
	end: 'end',
	success: 'success',
	fail: 'fail'
};

const app = {
	langs: [
		'tr',
		'en'
	],
	words: [],
	settings: {},
	pages: [
		document.querySelector('.home'),
		document.querySelector('.game'),
		document.querySelector('.settings')
	],
	staticElements: {
		word: document.querySelector('.word'),
		modal: document.querySelector('.modal'),
		countdown: document.querySelector('.countdown'),
		playCountdown: document.querySelector('.play-countdown'),
		settings: {
			lang: document.querySelector('.modal-settings #option-lang'),
			countdown: document.querySelector('.modal-settings #option-countdown'),
			theme: document.querySelector('.modal-settings #option-theme'),
			floatNotification: document.querySelector('.modal-settings .float-notification')
		},
	},
	audioManager: {
		_ctx: null,
		_profiles: [],
		init() {
			this._ctx = new (window.AudioContext || window.webkitAudioContext)();

			this._profiles = {
				countdown: { frequency: 880, duration: .3, type: 'square' },
				ending: { frequency: 440, duration: .3, type: 'triangle' },
				play: { frequency: 1200, duration: .8, type: 'square' },
				end: { frequency: 1800, duration: 1.0, type: 'triangle' }
			};
		},
		async play(soundName) {
			if (this._ctx.state === 'suspended') {
				await this._ctx.resume();
			}

			const profile = this._profiles[soundName];
			if (!profile) return;

			const oscillator = this._ctx.createOscillator();
			const gainNode = this._ctx.createGain();

			oscillator.type = profile.type;
			oscillator.frequency.setValueAtTime(profile.frequency, this._ctx.currentTime);

			gainNode.gain.setValueAtTime(0.3, this._ctx.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(0.0001, this._ctx.currentTime + profile.duration);
			
			oscillator.connect(gainNode);
			gainNode.connect(this._ctx.destination);

			oscillator.start(this._ctx.currentTime);
			oscillator.stop(this._ctx.currentTime + profile.duration);
		}
	},
	storageManager: {
		nameSpace: 'kelimator',
		getKey(key) {
			return `${this.nameSpace}:${key}`;
		},
		set(key, value) {
			localStorage.setItem(this.getKey(key), JSON.stringify(value));
		},
		get(key, defaultValue = null) {
			const item = localStorage.getItem(this.getKey(key));
			if (item === null) return defaultValue;

			try {
				return JSON.parse(item);
			} catch {
				return defaultValue;
			}
		},
		remove(key) {
			localStorage.removeItem(this.getKey(key));
		},
		clear() {
			Object.keys(localStorage).forEach(k => {
				if (k.startsWith(this.namespace + ":")) {
					localStorage.removeItem(k);
				}
			});
		}
	},
	timer: {
		end: -1,
		_onUpdate: null,
		_rafId: null,
		_start: null,
		_running: false,
		_elapsedSecond: -1,
		_elapsedTime: 0,
		init(end, onUpdate) {
			this.reset();

			this.end = end;
			this._onUpdate = onUpdate;

			this._running = true;

			this._rafId = requestAnimationFrame(this._loop.bind(this));
		},
		pause() {
			if (!this._running) return;
			this._running = false;

			cancelAnimationFrame(this._rafId);
		},
		resume() {
			this._running = true;
			this._start = null;
			this._rafId = requestAnimationFrame(this._loop.bind(this));
		},
		reset() {
			this.end = -1;
			this._elapsedSecond = -1;
			this._elapsedTime = 0;

			this._start = null;
			this._onUpdate = null;
			this._running = false;

			cancelAnimationFrame(this._rafId);
		},
		_loop(delta) {
			if (!this._running) return;

			if (!this._start)
				this._start = delta - this._elapsedTime;

			this._elapsedTime = delta - this._start;
			const second = Math.floor(this._elapsedTime / 1000);

			if (this._onUpdate && this._elapsedSecond != second) this._onUpdate(second);

			this._elapsedSecond = second;

			this._rafId = requestAnimationFrame(this._loop.bind(this));
		},
		_now() {
			return performance.now();
		},
		_getTime() {
			return this.now() - this.start;
		},
	},
	modal: {
		show() {
			app.staticElements.modal.showModal();
			app.timer.pause();
			app.loadChanges();
		},
		close() {
			app.staticElements.modal.close();
			app.timer.resume();
		},
		isOpen() {
			return app.staticElements.modal.open;
		}
	},
	onSettingChanged: async (key, el) => {
		if (key == 'lang')
			app.settings.lang = el.value;

		if (key == 'countdown')
			app.settings.countdown = el.value;

		if (key == 'theme')
			app.settings.theme = el.value;

		app.playAnimation(app.staticElements.settings.floatNotification, 'fade-in-down');

		app.storageManager.set('settings', app.settings);

		app.resources = await app.xhr(`langs/${app.settings.lang}.json`);
		app.words = await app.xhr(`assets/words.${app.settings.lang}.json`);

		app.updateResources();
	},
	loadChanges: () => {
		app.staticElements.settings.lang.value = app.settings.lang || 'tr';
		app.staticElements.settings.theme.value = app.settings.theme || 'light';
		app.staticElements.settings.countdown.value = app.settings.countdown || 30;

		app.staticElements.settings.floatNotification.classList.remove('fade-in-down');
	},
	onVisibilityChanged: () => {
		if (document.visibilityState == 'hidden') {
			app.timer.pause();
		} else {
			if (!app.modal.isOpen() && app.settings.page == E_PAGES.game)
				app.timer.resume();
		}
	},
	play(audio) {
		if (app.settings.volume == 'on')
			app.audioManager.play(audio);
	},
	async xhr(path) {
		try {
			const res = await fetch(path);
			return await res.json();
		} catch (e) {
			console.error('error', e);
		}
	},
	showPage(pageIndex) {
		this.pages.forEach((x, i) => {
			x.classList.add('hide');

			if (i == pageIndex)
				x.classList.remove('hide');
		});

		app.timer.reset();

		this.settings.page = pageIndex;
		this.storageManager.set('settings', this.settings);

		this.updatePageUI(this.settings.page);
	},
	async init() {
		const lang = (navigator.language || "tr").slice(0, 2);

		this.audioManager.init();

		if (app.langs.indexOf(lang) == -1)
			lang = 'en';

		this.settings = await this.storageManager.get('settings') || {};

		if (!this.settings.theme)
			this.settings.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

		if (!this.settings.lang)
			this.settings.lang = lang;

		if (!this.settings.page)
			this.settings.page = E_PAGES.home;

		if (!this.settings.volume)
			this.settings.volume = 'on';

		if (!this.settings.countdown)
			this.settings.countdown = 30;

		this.resources = await this.xhr(`langs/${this.settings.lang}.json`);
		this.updateResources();

		this.showPage(this.settings.page);

	},
	updateResources() {
		const resourceKeys = document.querySelectorAll('[resource-key]');
		resourceKeys.forEach(x => x.textContent = this.resources[`${x.attributes['resource-key'].value}`]);

		document.documentElement.lang = app.settings.lang;

		if (app.settings.theme == 'default') {
			document.documentElement.removeAttribute('data-theme');
		} else {
			document.documentElement.setAttribute('data-theme', app.settings.theme);
		}
	},
	async updatePageUI(pageIndex) {
		const page = this.pages[pageIndex];

		if (this.settings.page == E_PAGES.game) {
			this.words = await this.xhr(`assets/words.${app.settings.lang}.json`);
			page.querySelector('.volume-on').style.display = this.settings.volume == 'on' ? 'block' : 'none';
			page.querySelector('.volume-off').style.display = this.settings.volume == 'on' ? 'none' : 'block';

			this.nextWord();
		}
	},
	changeVolume() {
		const volumeEl = this.pages[E_PAGES.game].querySelector('.volume-button');

		volumeEl.querySelector('.volume-on').style.display = this.settings.volume == 'on' ? 'none' : 'block';
		volumeEl.querySelector('.volume-off').style.display = this.settings.volume == 'on' ? 'block' : 'none';

		this.settings.volume = this.settings.volume == 'on' ? 'off' : 'on';
		this.storageManager.set('settings', this.settings);
	},
	getRandomWord() {
		const randomIndex = Math.floor(Math.random() * this.words.length);
		return this.words[randomIndex];
	},
	nextWord() {
		app.hide(app.staticElements.word);
		app.show(app.staticElements.playCountdown);
		app.staticElements.countdown.classList.remove('danger');

		app.staticElements.word.innerText = '';
		app.staticElements.countdown.innerText = '';
		app.staticElements.playCountdown.innerText = '';

		this.timer.init(3, this.onBeforePlayed);
	},
	onBeforePlayed(elapsedSecond) {
		let remained = app.timer.end - elapsedSecond;
		if (remained > 0) {

			app.playAnimation(app.staticElements.playCountdown, 'count-down-animation');
			app.staticElements.playCountdown.textContent = `${remained}`;

			app.play(E_AUDIOS.countdown);
		} else {
			app.hide(app.staticElements.playCountdown);
			app.play(E_AUDIOS.play);

			app.fillWord();
		}
	},
	onPlayed(elapsedSecond) {
		let remained = app.timer.end - elapsedSecond;

		app.playAnimation(app.staticElements.countdown, 'count-down-animation');
		app.staticElements.countdown.textContent = `${remained}`;

		if (remained > 0) {
			if (remained <= 5)
				app.play(E_AUDIOS.ending);
		} else {
			app.play(E_AUDIOS.end);
			app.staticElements.countdown.textContent = app.resources.timesUp;

			app.timer.reset();
			// TODO: RESET SONRASI, countdown gizle, kelimeyi gizle, 
		}
	},
	fillWord() {
		const word = this.getRandomWord();

		app.show(app.staticElements.word);
		app.staticElements.word.innerText = `${word}`;

		this.timer.init(this.settings.countdown, this.onPlayed);
	},
	hide: (el) => el.classList.add('hide'),
	show: (el) => el.classList.remove('hide'),
	playAnimation: (el, animationClass) => {
		el.classList.remove(animationClass);
		void el.offsetHeight;
		el.classList.add(animationClass);
	}
};