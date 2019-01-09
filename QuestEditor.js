class Builder {
  constructor(tag, classes, owner) {
    if (tag === 'text') {
      this.element = document.createTextNode('');
    } else {
      this.element = document.createElement(tag);
    }

    if (owner === undefined) {
      typeof classes === 'string' ? this.attr('class', classes) : this.element.owner = classes;
    } else {
      this.attr('class', classes);
      this.element.owner = owner;
    }
  }

  from(element) {
    this.element = (typeof element === 'string' ? document.getElementById(element) : element);

    return this;
  }

  attr(name, value) {
    this.element.setAttribute(name, value);

    return this;
  }

  style(name, value) {
    this.element.style[name] = value;

    return this;
  }

  text(value) {
    this.element.textContent = value;

    return this;
  }

  append(element) {
    this.element.appendChild(element instanceof Builder ? element.element : element);

    return this;
  }

  prepend(element) {
    this.element.insertBefore(element instanceof Builder ? element.element : element, this.element.firstChild);

    return this;
  }
}

class QuestEditor {
  constructor(options) {
    this.root = new Builder().from(options.root);

    const stylesheet = new Builder('style');
    stylesheet.element.textContent += '.editor-wrapper { font-family: monospace; font-size: 12px; }\n';
    stylesheet.element.textContent += '.editor-description { color: #888888; font-size: 10px; }\n';
    stylesheet.element.textContent += '.editor-control-button { background: transparent; border: none; padding: 0px 10px; }\n';
    stylesheet.element.textContent += '.flex-row-container { display: flex; flex-direction: row; }\n';
    stylesheet.element.textContent += '.flex-column-container { display: flex; flex-direction: column; }\n';
    stylesheet.element.textContent += '.flex-centered-container { display: flex; align-items: center; justify-content: center; }\n';
    this.root.append(stylesheet);

    // Wrapper
    const w = new Builder('div', 'flex-row-container editor-wrapper')
        .style('margin', 'auto').style('max-width', '1200px');
    this.root.append(w);

    // Left subwrapper
    const lfsw = new Builder('div', 'flex-column-container')
        .style('width', '40%');
    w.append(lfsw);

    // Upper subsubwrapper
    const upssw = new Builder('div', 'flex-row-container');
    lfsw.append(upssw);

    // Left subsubsubwrapper
    const lfsssw = new Builder('div', 'flex-column-container')
        .style('width', '30%').style('margin', '0px 16px 0px 0px');
    upssw.append(lfsssw);

    // Middle subsubwrapper
    const mdssw = new Builder('div');
    mdssw.append(new Builder('button', this)
        .style('width', '100%').attr('onclick', 'this.owner.onStepAdded()').text('Добавить этап'));
    lfsw.append(mdssw);

    // Lower subsubwrapper
    const lwssw = new Builder('div');
    lfsw.append(lwssw);

    this.availableProperties = new Builder('div', 'flex-column-container')
        .style('width', '70%').style('height', '512px').style('overflow', 'auto');
    upssw.append(this.availableProperties);

    this.descriptionVisibilityToggler = new Builder('label', 'flex-centered-container')
        .append(new Builder('input', this).attr('type', 'checkbox').attr('onchange', 'this.owner.onTypeChanged(this.owner.typeSelector.element.value);').attr('checked', ''))
        .append(new Builder('text').text('Описания свойств'));
    lfsssw.append(this.descriptionVisibilityToggler);

    this.descriptionVisibilityToggler = new Builder().from(this.descriptionVisibilityToggler.element.firstChild);

    this.npcnameSelector = new Builder('select');
    lfsssw.prepend(this.npcnameSelector);

    this.typeSelector = new Builder('select', this)
        .attr('onchange', 'this.owner.onTypeChanged(this.value);');
    lfsssw.prepend(this.typeSelector);

    this.stepsList = new Builder('div', 'flex-column-container')
        .style('width', '60%').style('height', '832px').style('overflow', 'auto').style('padding', '0px 10px');
    w.append(this.stepsList);

    this.questCode = new Builder('pre', 'flex-column-container')
      .style('height', '288px').style('overflow', 'auto').style('margin', '0px');
    lwssw.append(this.questCode);

    if (typeof options.protocol === 'object') {
      this.protocol = options.protocol;
    } else {
      // TODO: implement.
    }

    for (const type in protocol.types)
      if (type !== 'ANY') this.typeSelector.element.options.add(new Option(type, type));

    for (const npcname in protocol.npcnames)
      this.npcnameSelector.element.options.add(new Option(protocol.npcnames[npcname].name, npcname));

    this.onTypeChanged('GLOBAL');
  }

  onTypeChanged(type) {
    while (this.availableProperties.element.firstChild !== null)
      this.availableProperties.element.removeChild(this.availableProperties.element.firstChild);

    const properties = Object.assign({}, type === 'GLOBAL' ? {} : this.protocol.types['ANY'], this.protocol.types[type]);
    for (const _property in properties) {
      const property = properties[_property];
      property.name = _property;

      const wrapper = new Builder('div', 'flex-row-container');
      wrapper.style('align-items', 'center');
      wrapper.style('justify-content', 'space-between');

      // Property name
      wrapper.append(new Builder('text').text(`${property.name}${property.required ? '*' : ''}`));

      // Property value input field (or checkbox, if property requires it)
      const subwrapper = new Builder('div', 'flex-row-container').style('align-items', 'center');

      const input = new Builder('input').attr('name', property.name).attr('type', property.type === 1 ? 'checkbox' : 'text');
      if (input.element.getAttribute('type') === 'text') input.style('width', '160px');
      subwrapper.append(input);

      if (property.type === 2) {
        const button = new Builder('button', this);
        button.attr('onclick', 'this.owner.openExternalEditor(this.parentElement.parentElement);');
        button.style('width', '32px');
        button.style('padding', '0px');
        button.text('...');

        subwrapper.append(button);
      } else {
        subwrapper.append(new Builder('div').style('width', '32px'));
      }

      wrapper.append(subwrapper);
      this.availableProperties.append(wrapper);

      // Property description
      if (this.descriptionVisibilityToggler.element.checked) {
        const wrapper = new Builder('div').style('line-height', '0.85');
        wrapper.append(new Builder('i', 'editor-description')
            .text((property.description === '' || property.description === undefined) ? '(не указано)' : `- ${property.description}`));

        this.availableProperties.append(wrapper);
      }
    }
  }

  addStep(code) {
    const wrapper = new Builder('div', 'flex-row-container');
    wrapper.element.code = code;

    // Step controls (move up/down, delete)
    const controls = new Builder('div', 'flex-row-container flex-centered-container').style('width', '64px');
    controls.append(new Builder('button', 'editor-control-button', this).text('ʌ').attr('onclick', 'this.owner.moveStep(this.parentElement.parentElement, "up");'));
    controls.append(new Builder('button', 'editor-control-button', this).text('v').attr('onclick', 'this.owner.moveStep(this.parentElement.parentElement, "down");'));
    controls.append(new Builder('button', 'editor-control-button', this).text('x').attr('onclick', 'this.owner.deleteStep(this.parentElement.parentElement);'));
    wrapper.append(controls);

    // Main step information (ordinal number, type and NPC name)
    const information = new Builder('div', 'flex-column-container flex-centered-container').style('width', '144px');
    information.append(new Builder('strong').text(`${this.stepsList.element.children.length / 2}. ${code.type}`));
    information.append(new Builder('i').text(code.npcname));
    wrapper.append(information);

    // Step data, depends on type
    const data = new Builder('div', 'flex-row-container flex-centered-container').style('width', '192px');
    switch (code.type) {
      case 'INFO':
        data.text(`${code.wait} с.`);
      break;

      default:
        data.text('');
    }

    wrapper.append(data);

    // Step description (title, description and, if provided, post message)
    const description = new Builder('div', 'flex-column-container');
    description.append(new Builder('strong').text(code.title));
    description.append(new Builder('text').text(code.about));
    if (code.postmessage !== undefined) description.append(new Builder('i').text(code.postmessage));
    wrapper.append(description);

    this.stepsList.append(wrapper);
    this.stepsList.append(new Builder('hr').style('width', '100%'));

    this.onTypeChanged(this.typeSelector.element.value);
    this.updateQuestCode();

    this.stepsList.element.scrollTop = this.stepsList.element.scrollHeight;
  }

  onStepAdded() {
    const code = {
      type: this.typeSelector.element.value,
      npcname: this.npcnameSelector.element.value
    };

    if (code.type === 'GLOBAL') delete code.npcname;

    for (const property of this.availableProperties.element.children) {
      if (property.children.length === 1 && property.children[0].children.length !== 0) {
        const input = property.children[0].children[0];
        if ((input.type === 'text' && input.value !== '') || (input.type === 'checkbox' && input.checked))
          code[input.name] = (input.type === 'text' ? input.value : '');
      }
    }

    this.addStep(code);
  }

  updateOrdinalNumber(step, offset) {
    const information = step.children[1].children[0].textContent.split('.');
    information[0] = parseInt(information[0]) + offset;
    step.children[1].children[0].textContent = information.join('.');
  }

  deleteStep(step) {
    if (step.nextSibling.nextSibling !== null) {
      let offset = step.nextSibling.nextSibling;
      while (offset.nextSibling !== null) {
        if (offset.children.length === 4) this.updateOrdinalNumber(offset, -1);

        offset = offset.nextSibling;
      }
    }

    step.parentElement.removeChild(step.nextSibling);
    step.parentElement.removeChild(step);

    this.updateQuestCode();
  }

  moveStep(step, direction) {
    if (direction === 'up' && step.previousSibling !== null) {
      if (step.previousSibling.textContent === '\n\n  ') return;

      this.updateOrdinalNumber(step, -1);
      this.stepsList.element.insertBefore(step, step.previousSibling.previousSibling);

      this.updateOrdinalNumber(step.nextSibling, +1);
      this.stepsList.element.insertBefore(step.nextSibling, step.nextSibling.nextSibling.nextSibling);

      this.updateQuestCode();
    }

    else if (direction === 'down' && step.nextSibling.nextSibling !== null) {
      this.updateOrdinalNumber(step, +1);
      this.stepsList.element.insertBefore(step, step.nextSibling.nextSibling.nextSibling);

      this.updateOrdinalNumber(step.previousSibling, -1);
      this.stepsList.element.insertBefore(step.previousSibling, step.previousSibling.previousSibling);

      this.updateQuestCode();
    }
  }

  openExternalEditor(step) {
    alert('Edit `QuestEditor.openExternalEditor()` function in order to setup an external editor.');
  }

  updateQuestCode() {
    this.questCode.text('');
    for (const step of this.stepsList.element.children) {
      if (step.code !== undefined) {
        let code = (step.code.type === 'GLOBAL' ? '' : `task:${step.code.type}\n`);
        for (const property in step.code)
          if (property !== 'type')
            code += `${property}${step.code[property] === '' ? '' : `:${step.code[property]}`}\n`;

        if (step.code.type !== 'GLOBAL') code += 'endtask\n';

        this.questCode.text(`${this.questCode.element.textContent}\n${code}`);
      }
    }

    this.questCode.element.scrollTop = this.questCode.element.scrollHeight;
  }
}
