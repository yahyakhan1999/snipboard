import * as vscode from 'vscode';

class SnippetItem extends vscode.TreeItem {
	constructor(public readonly text: string) {
		super(
			text.length > 50
				? text.substring(0, 50) + '...'
				: text,
			vscode.TreeItemCollapsibleState.None
		);

		this.tooltip = text;
		this.description = 'Click to copy';

		this.command = {
			command: 'snipboard.copySnippet',
			title: 'Copy Snippet',
			arguments: [text]
		};
	}
}

class ClipboardHistoryProvider implements vscode.TreeDataProvider<SnippetItem> {

	private _onDidChangeTreeData = new vscode.EventEmitter<void>();

	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(public history: string[]) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: SnippetItem): vscode.TreeItem {
		return element;
	}

	getChildren(): Thenable<SnippetItem[]> {
		return Promise.resolve(
			this.history.map(item => new SnippetItem(item))
		);
	}
}

export function activate(context: vscode.ExtensionContext) {

	let history = context.globalState.get<string[]>(
		'clipboardHistory',
		[]
	);

	const provider = new ClipboardHistoryProvider(history);

	vscode.window.registerTreeDataProvider(
		'snipboardView',
		provider
	);

	const copySnippet = vscode.commands.registerCommand(
		'snipboard.copySnippet',
		async (text: string) => {

			await vscode.env.clipboard.writeText(text);

			vscode.window.showInformationMessage(
				'Copied snippet'
			);
		}
	);

	let lastClipboard = '';

	const watcher = setInterval(async () => {

		try {

			const current =
				(await vscode.env.clipboard.readText()).trim();

			if (
				current.length < 8 ||
				current === lastClipboard
			) {
				return;
			}

			lastClipboard = current;

			history = history.filter(
				item => item !== current
			);

			history.unshift(current);

			history = history.slice(0, 50);

			await context.globalState.update(
				'clipboardHistory',
				history
			);

			provider.history = history;

			provider.refresh();

		} catch {
			// ignore clipboard errors
		}

	}, 2000);

	context.subscriptions.push(
		copySnippet,
		{
			dispose: () => clearInterval(watcher)
		}
	);

	vscode.window.showInformationMessage(
		'SnipBoard Active'
	);
}

export function deactivate() {}