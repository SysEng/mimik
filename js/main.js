'use strict';

const E_PAGES = {
	home: 0,
	game: 1,
	settings: 2
};

const E_AUDIOS = {
	countdown: 0,
	play: 1,
	ending: 2,
	end: 3,
	success: 4,
	fail: 5
};

const app = {
	words: [],
	settings: {},
	audio: [
		new Audio('assets/countdown.wav'),
		new Audio('assets/play.wav'),
		new Audio('assets/ending.wav'),
		new Audio('assets/end.wav'),
		// new Audio('assets/success.wav'),
		// new Audio('assets/fail.wav'),
	],
	pages: [
		document.querySelector('.home'),
		document.querySelector('.game'),
		document.querySelector('.settings')
	],
	lang: (navigator.language || "tr").slice(0, 2),
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
		elapsed: 0,
		_end: -1,
		_onUpdate: null,
		_rafId: null,
		_start: null,
		_running: false,
		init(end, onUpdate) {
			this.elapsed = 0;

			this._end = end;
			this._onUpdate = onUpdate;

			this._running = true;
			this._start = this._now();

			this._loop();
		},
		reset() {
			this.elapsed = 0;

			this._end = -1;
			this._start = null;
			this._onUpdate = null;
			this._running = false;

			cancelAnimationFrame(this._rafId);
		},
		_loop(delta) {
			if (!app.timer._running) return;

			if (!delta)
				delta = app.timer._now();

			const elapsed = delta - app.timer._start;

			if (app.timer._onUpdate) app.timer._onUpdate(elapsed);

			app.timer._rafId = requestAnimationFrame(app.timer._loop);
		},
		_now() {
			return performance.now();
		},
		_getTime() {
			return this.now() - this.start;
		},
	},
	play(audio) {
		if (app.settings.volume == 'on')
			app.audio[audio].play();
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
		const resources = await this.xhr(`langs/${this.lang}.json`);
		this.settings = await this.storageManager.get('settings') || {};

		if (resources.title) {
			this.resources = resources;
			this.updateResources();

			if (!this.settings.page)
				this.settings.page = E_PAGES.home;

			if (!this.settings.volume)
				this.settings.volume = 'on';

			if (!this.settings.countdown)
				this.settings.countdown = 60;

			this.showPage(this.settings.page);
		} else {
			alert('error, resource cannot loaded');
		}
	},
	updateResources() {
		const resourceKeys = document.querySelectorAll('[resource-key]');
		resourceKeys.forEach(x => x.textContent = this.resources[`${x.attributes['resource-key'].value}`]);
	},
	async updatePageUI(pageIndex) {
		const page = this.pages[pageIndex];

		if (this.settings.page == E_PAGES.home) {

		}

		if (this.settings.page == E_PAGES.game) {
			this.words = await this.xhr(`assets/words.json`);
			page.querySelector('.volume-on').style.display = this.settings.volume == 'on' ? 'block' : 'none';
			page.querySelector('.volume-off').style.display = this.settings.volume == 'on' ? 'none' : 'block';

			this.nextWord();
		}

		if (this.settings.page == E_PAGES.settings) {

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
		const word = this.getRandomWord();
		const page = this.pages[E_PAGES.game];

		const wordEl = page.querySelector('.word');
		const countDownEl = page.querySelector('.countdown');
		const playCountDownEl = page.querySelector('.play-countdown');

		wordEl.classList.add('hide');
		countDownEl.classList.remove('danger');
		playCountDownEl.classList.remove('hide');

		wordEl.innerText = '';
		countDownEl.innerText = '';
		playCountDownEl.innerText = '';

		this.timer.init(3, this.onBeforePlayed);
	},
	onBeforePlayed(elapsed) {
		const page = app.pages[E_PAGES.game];
		const playCountDownEl = page.querySelector('.play-countdown');

		const second = Math.floor(elapsed / 1000);

		if (app.timer.elapsed < second) {
			app.timer.elapsed = second;

			let remained = 4 - app.timer.elapsed;

			if (remained > 0) {
				playCountDownEl.textContent = `${remained}`;
				app.play(E_AUDIOS.countdown);
			} else {
				remained = 0;

				app.hide(playCountDownEl);
				app.play(E_AUDIOS.play);

				app.timer.reset();

				app.fillWord();
			}
		}
	},
	onPlayed(elapsed) {
		const page = app.pages[E_PAGES.game];
		const playCountDownEl = page.querySelector('.countdown');

		const second = Math.floor(elapsed / 1000);

		if (app.timer.elapsed < second) {
			app.timer.elapsed = second;

			let remained = app.settings.countdown - app.timer.elapsed;
			if (remained < 0)
				remained = 0;

			playCountDownEl.textContent = `${remained}`;

			if (remained > 0) {
				if (remained <= 5)
					app.play(E_AUDIOS.countdown);
			} else {
				app.play(E_AUDIOS.end);
				playCountDownEl.textContent = app.resources.timesUp;

				app.timer.reset();
				// TODO: RESET SONRASI, countdown gizle, kelimeyi gizle, 
			}
		}
	},
	fillWord() {
		const page = app.pages[E_PAGES.game];
		const word = this.getRandomWord();
		const wordEl = page.querySelector('.word');

		app.show(wordEl);
		wordEl.innerText = `${word}`;

		this.timer.init(this.settings.countDown, this.onPlayed);
	},
	hide(el) {
		el.classList.add('hide');
	},
	show(el) {
		el.classList.remove('hide');
	}
};