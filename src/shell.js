/* global $, localStorage */

class Shell {
  constructor(term, commands, struct) {
    this.commands = commands;
    this.struct = struct;
    this.setupListeners(term);
    this.term = term;

    localStorage.directory = 'home';
    localStorage.history = JSON.stringify('');
    localStorage.historyIndex = -1;
    localStorage.inHistory = false;

    $('.input').focus();
  }

  setupListeners(term) {
    $('#terminal').mouseup(() => $('.input').last().focus());

    term.addEventListener('keyup', (evt) => {
      const keyUp = 38;
      const keyDown = 40;
      const key = evt.keyCode;

      if ([keyUp, keyDown].includes(key)) {
        let history = localStorage.history;
        history = history ? Object.values(JSON.parse(history)) : [];

        if (key === keyUp) {
          if (localStorage.historyIndex >= 0) {
            if (localStorage.inHistory == 'false') {
              localStorage.inHistory = true;
            }
            // Prevent repetition of last command while traversing history.
            if (localStorage.historyIndex == history.length - 1 && history.length !== 1) {
              localStorage.historyIndex -= 1;
            }
            $('.input')
              .last()
              .html(`${history[localStorage.historyIndex]}<span class="end"><span>`);
            if (localStorage.historyIndex != 0) localStorage.historyIndex -= 1;
          }
        } else if (key === keyDown) {
          if (localStorage.inHistory == 'true' && localStorage.historyIndex < history.length) {
            let ret;

            if (localStorage.historyIndex > 0) {
              ret = `${history[localStorage.historyIndex]}<span class="end"><span>`;
              if (localStorage.historyIndex != history.length - 1) {
                localStorage.historyIndex = Number(localStorage.historyIndex) + 1;
              }
              // Prevent repetition of first command while traversing history.
            } else if (localStorage.historyIndex == 0 && history.length > 1) {
              ret = `${history[1]}<span class="end"><span>`;
              localStorage.historyIndex = history.length !== 2 ? 2 : 1;
            }
            $('.input').last().html(ret);
          }
        }
        evt.preventDefault();
        $('.end').focus();
      }
    });

    term.addEventListener('keydown', (evt) => {
      // Keydown legend:
      // 9 -> Tab key.
      // 27 -> Escape key.
      // 8 -> Backspace key.
      // 46 -> Delete key.

      if (evt.keyCode === 9) {
        const prompt = evt.target;
        const input = prompt.textContent.trim().split(' ');
        this.handleTabCompletion(input, prompt);
        evt.preventDefault();
      } else if (evt.keyCode === 27) {
        $('.terminal-window').toggleClass('fullscreen');
      } else if (evt.keyCode === 8 || evt.keyCode === 46) {
        this.resetHistoryIndex();
      }
    });

    term.addEventListener('keypress', (evt) => {
      // Exclude these keys for Firefox, as they're fired for arrow/tab keypresses.
      if (![9, 27, 37, 38, 39, 40].includes(evt.keyCode)) {
        // If input keys are pressed then resetHistoryIndex() is called.
        this.resetHistoryIndex();
      }
      if (evt.keyCode === 13) {
        const prompt = evt.target;
        const input = prompt.textContent.trim().split(' ');
        const cmd = input[0].toLowerCase();
        const args = input[1];

        if (cmd === 'clear') {
          this.updateHistory(cmd);
          this.clearConsole();
        } else if (cmd && cmd in this.commands) {
          this.runCommand(cmd, args);
          this.resetPrompt(term, prompt);
          const dir = localStorage.directory;
          $('.path').last().html(dir === 'home' ? '~' : dir);
        } else {
          this.term.innerHTML += 'Error: command not recognized';
          this.resetPrompt(term, prompt);
        }
        evt.preventDefault();
      }
    });
  }

  setCursorToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  handleTabCompletion(input, prompt) {
    const cmd = input[0].toLowerCase();
    const arg = input[1];
    const getDirectory = () => localStorage.directory;
    const currDir = getDirectory();

    if (arg) {
      let candidates;
      if (cmd === 'cd' || cmd === 'ls') {
        candidates = Object.keys(this.struct);
      } else {
        const dir = this.struct[currDir];
        if (dir) {
          candidates = dir;
        }
      }

      if (candidates) {
        const autocomplete = candidates.filter((item) => item.startsWith(arg));
        if (autocomplete.length === 1) {
          let completion = autocomplete[0];
          if (cmd === 'cat') {
            completion += '.txt';
          }
          prompt.textContent = cmd + ' ' + completion;
          this.setCursorToEnd(prompt);
        }
      }
    } else {
      const autocomplete = Object.keys(this.commands).filter((item) => item.startsWith(cmd));
      if (autocomplete.length === 1) {
        prompt.textContent = autocomplete[0] + ' ';
        this.setCursorToEnd(prompt);
      }
    }
  }

  runCommand(cmd, args) {
    const command = args ? `${cmd} ${args}` : cmd;
    this.updateHistory(command);

    const output = this.commands[cmd](args);
    if (output) {
      this.term.innerHTML += output;
    }
  }

  resetPrompt(term, prompt) {
    const newPrompt = prompt.parentNode.cloneNode(true);
    prompt.setAttribute('contenteditable', false);

    if (this.prompt) {
      newPrompt.querySelector('.prompt').textContent = this.prompt;
    }

    term.appendChild(newPrompt);
    newPrompt.querySelector('.input').innerHTML = '';
    newPrompt.querySelector('.input').focus();
  }

  resetHistoryIndex() {
    let history = localStorage.history;

    history = history ? Object.values(JSON.parse(history)) : [];
    if (localStorage.goingThroughHistory == true) {
      localStorage.goingThroughHistory = false;
    }

    if (history.length == 0) {
      localStorage.historyIndex = -1;
    } else {
      localStorage.historyIndex = history.length - 1 > 0 ? history.length - 1 : 0;
    }
  }

  updateHistory(command) {
    let history = localStorage.history;
    history = history ? Object.values(JSON.parse(history)) : [];

    history.push(command);
    localStorage.history = JSON.stringify(history);
    localStorage.historyIndex = history.length - 1;
  }

  clearConsole() {
    const getDirectory = () => localStorage.directory;
    const dir = getDirectory();

    $('#terminal').html(
      `<p class="hidden">
          <span class="prompt">
            <span class="path">${dir === 'home' ? '~' : dir}</span>
            <span class="tick">$</span>
          </span>
          <span contenteditable="true" class="input" spellcheck="false"></span>
        </p>`,
    );

    $('.input').focus();
  }
}
