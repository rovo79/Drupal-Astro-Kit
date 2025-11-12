#!/usr/bin/env node
'use strict';

const React = require('react');
const path = require('path');
const fs = require('fs');
const createUi = require('./ui');

(async () => {
	try {
		const inkModule = await import('ink');
		const SpinnerModule = await import('ink-spinner');
		const TextInputModule = await import('ink-text-input');
		const SelectInputModule = await import('ink-select-input');
		const execaModule = await import('execa');

		const {render, ...inkComponents} = inkModule;
		const Spinner = SpinnerModule.default ?? SpinnerModule;
		const TextInput = TextInputModule.default ?? TextInputModule;
		const SelectInput = SelectInputModule.default ?? SelectInputModule;
		const {execa} = execaModule;

		const App = createUi({
			React,
			ink: inkComponents,
			Spinner,
			TextInput,
			SelectInput,
			execa,
			fs: fs.promises,
			path
		});

		render(React.createElement(App, {}));
	} catch (error) {
		console.error('Failed to launch setup CLI:', error);
		process.exit(1);
	}
})();
