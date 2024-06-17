document.getElementById('save-form-1').addEventListener('submit', savePage1);
document.getElementById('save-form-2').addEventListener('submit', savePage2);
document.getElementById('export-button-1').addEventListener('click', exportPages1);
document.getElementById('export-button-2').addEventListener('click', exportPages2);
document.getElementById('style-button-1').addEventListener('change', changeColorScheme1);
document.getElementById('style-button-2').addEventListener('change', changeColorScheme2);
document.getElementById('search-input-1').addEventListener('input', displayGroupsAndPages1);
document.getElementById('search-input-2').addEventListener('input', displayGroupsAndPages2);

function savePage1(e) {
  e.preventDefault();
  savePage('group-select-1', 'group-input-1', 'message-1', 'groups-list-1', 'pages1', 'groups1', displayGroupsAndPages1, 'save-form-1');
}

function savePage2(e) {
  e.preventDefault();
  savePage('group-select-2', 'group-input-2', 'message-2', 'groups-list-2', 'pages2', 'groups2', displayGroupsAndPages2, 'save-form-2');
}

function savePage(groupSelectId, groupInputId, messageId, listId, storagePagesKey, storageGroupsKey, displayFunc, formId) {
  const groupSelect = document.getElementById(groupSelectId);
  const groupInput = document.getElementById(groupInputId);
  const selectedGroup = groupSelect.value;
  const newGroup = groupInput.value.trim();

  const date = new Date();
  const options = { month: 'long', day: 'numeric', weekday: 'long' };
  const defaultGroup = date.toLocaleDateString('en-US', options);

  const group = newGroup !== '' ? newGroup : (selectedGroup !== '' ? selectedGroup : defaultGroup);

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0];
    const page = {
      url: tab.url,
      title: tab.title,
      group: group,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}`,
      timestamp: new Date().getTime()
    };

    chrome.storage.local.get({ [storagePagesKey]: [], [storageGroupsKey]: [] }, function (result) {
      const pages = result[storagePagesKey];
      const existingPage = pages.find(p => p.url === page.url);

      if (existingPage) {
        if (existingPage.group === page.group) {
          document.getElementById(messageId).textContent = 'Item Saved Already';
        } else {
          document.getElementById(messageId).textContent = `This page is already saved in the group: ${existingPage.group}`;
        }
        return;
      }

      pages.push(page);
      const groups = result[storageGroupsKey].includes(group) ? result[storageGroupsKey] : [...result[storageGroupsKey], group];

      chrome.storage.local.set({ [storagePagesKey]: pages, [storageGroupsKey]: groups }, function () {
        displayFunc();
        updateGroupSelect(groupSelectId, storageGroupsKey);
        document.getElementById(formId).reset();
        document.getElementById(messageId).textContent = '';
      });
    });
  });
}

function displayGroupsAndPages1() {
  displayGroupsAndPages('search-input-1', 'groups-list-1', 'pages1', 'groups1');
}

function displayGroupsAndPages2() {
  displayGroupsAndPages('search-input-2', 'groups-list-2', 'pages2', 'groups2');
}

function displayGroupsAndPages(searchInputId, listId, storagePagesKey, storageGroupsKey) {
  const searchKeyword = document.getElementById(searchInputId).value.toLowerCase();

  chrome.storage.local.get({ [storageGroupsKey]: [], [storagePagesKey]: [] }, function (result) {
    const groups = result[storageGroupsKey];
    let pages = result[storagePagesKey];

    // Filter pages based on the search keyword
    if (searchKeyword) {
      pages = pages.filter(page => page.title.toLowerCase().includes(searchKeyword));
    }

    const list = document.getElementById(listId);
    list.innerHTML = '';

    groups.forEach(group => {
      const groupLi = document.createElement('li');
      groupLi.className = 'group-container';
      groupLi.draggable = true;
      groupLi.dataset.group = group; // Added data attribute to store group name
      groupLi.addEventListener('dragstart', handleDragStart);
      groupLi.addEventListener('dragover', handleDragOver);
      groupLi.addEventListener('drop', handleDrop);
      groupLi.addEventListener('dragend', handleDragEnd);

      const groupTitle = document.createElement('h3');
      groupTitle.textContent = group;
      groupTitle.contentEditable = false; // Initially not editable
      groupTitle.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showGroupContextMenu(e, groupTitle, group, storagePagesKey, storageGroupsKey);
      });
      groupLi.appendChild(groupTitle);

      const groupPages = document.createElement('ul');
      groupPages.style.maxHeight = '100px';
      groupPages.style.overflowY = 'auto';
      pages.filter(page => page.group === group).forEach(page => {
        const pageLi = document.createElement('li');
        pageLi.style.display = 'flex';
        pageLi.style.alignItems = 'center';

        const favicon = document.createElement('img');
        favicon.src = page.favicon;
        favicon.alt = 'favicon';
        favicon.style.width = '16px';
        favicon.style.height = '16px';
        favicon.style.marginRight = '5px';

        const pageTitle = document.createElement('a');
        pageTitle.href = page.url;
        pageTitle.target = '_blank';
        pageTitle.textContent = page.title;
        pageTitle.className = 'page-title';
        pageTitle.contentEditable = false; // Initially not editable

        pageTitle.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          pageTitle.contentEditable = true;
          pageTitle.focus();
        });

        pageTitle.addEventListener('blur', () => {
          pageTitle.contentEditable = false;
          editPageTitle(page, pageTitle.textContent, storagePagesKey);
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.onclick = () => deletePage(page, storagePagesKey);

        pageLi.appendChild(favicon);  // Append the favicon
        pageLi.appendChild(pageTitle);
        pageLi.appendChild(deleteButton);
        groupPages.appendChild(pageLi);
      });

      groupLi.appendChild(groupPages);
      list.appendChild(groupLi);
    });
  });
}

function handleDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.dataset.group);
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const target = e.target.closest('.group-container');
  if (target) {
    const bounding = target.getBoundingClientRect();
    const offset = bounding.y + (bounding.height / 2);

    if (e.clientY - offset > 0) {
      target.style['border-bottom'] = '2px solid white';
      target.style['border-top'] = '';
    } else {
      target.style['border-top'] = '2px solid white';
      target.style['border-bottom'] = '';
    }
  }
}

function handleDrop(e) {
  e.preventDefault();
  const sourceGroup = e.dataTransfer.getData('text/plain');
  const target = e.target.closest('.group-container');
  if (target && target.dataset.group !== sourceGroup) {
    const groupsList = target.closest('ul');
    const groupContainers = Array.from(groupsList.children);
    const sourceIndex = groupContainers.findIndex(container => container.dataset.group === sourceGroup);
    const targetIndex = groupContainers.indexOf(target);

    const [movedGroup] = groupContainers.splice(sourceIndex, 1);
    groupContainers.splice(targetIndex, 0, movedGroup);

    groupsList.innerHTML = '';
    groupContainers.forEach(groupContainer => groupsList.appendChild(groupContainer));
  }

  Array.from(document.querySelectorAll('.group-container')).forEach(group => {
    group.style['border-top'] = '';
    group.style['border-bottom'] = '';
  });
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
}

function editPageTitle(page, newTitle, storagePagesKey) {
  chrome.storage.local.get({ [storagePagesKey]: [] }, function (result) {
    const pages = result[storagePagesKey].map(p => {
      if (p.url === page.url && p.group === page.group) {
        p.title = newTitle;
      }
      return p;
    });
    chrome.storage.local.set({ [storagePagesKey]: pages }, function () {
      displayGroupsAndPages1();
      displayGroupsAndPages2();
    });
  });
}

function editGroupName(oldGroupName, newGroupName, storagePagesKey, storageGroupsKey) {
  if (newGroupName && newGroupName !== oldGroupName) {
    chrome.storage.local.get({ [storagePagesKey]: [], [storageGroupsKey]: [] }, function (result) {
      const pages = result[storagePagesKey].map(page => {
        if (page.group === oldGroupName) {
          page.group = newGroupName;
        }
        return page;
      });
      const groups = result[storageGroupsKey].map(g => (g === oldGroupName ? newGroupName : g));
      chrome.storage.local.set({ [storagePagesKey]: pages, [storageGroupsKey]: groups }, function () {
        displayGroupsAndPages1();
        displayGroupsAndPages2();
        updateGroupSelect1();
        updateGroupSelect2();
      });
    });
  }
}

function updateGroupSelect1() {
  updateGroupSelect('group-select-1', 'groups1');
}

function updateGroupSelect2() {
  updateGroupSelect('group-select-2', 'groups2');
}

function updateGroupSelect(groupSelectId, storageGroupsKey) {
  chrome.storage.local.get({ [storageGroupsKey]: [] }, function (result) {
    const groups = result[storageGroupsKey];
    const select = document.getElementById(groupSelectId);
    select.innerHTML = '<option value="">--Select Existing Group--</option>';
    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      select.appendChild(option);
    });
  });
}

function deletePage(page, storagePagesKey) {
  chrome.storage.local.get({ [storagePagesKey]: [] }, function (result) {
    const pages = result[storagePagesKey].filter(p => !(p.url === page.url && p.group === page.group));
    chrome.storage.local.set({ [storagePagesKey]: pages }, function () {
      displayGroupsAndPages1();
      displayGroupsAndPages2();
    });
  });
}

function deleteGroup(group, storagePagesKey, storageGroupsKey) {
  chrome.storage.local.get({ [storagePagesKey]: [], [storageGroupsKey]: [] }, function (result) {
    const pages = result[storagePagesKey].filter(p => p.group !== group);
    const groups = result[storageGroupsKey].filter(g => g !== group);
    chrome.storage.local.set({ [storagePagesKey]: pages, [storageGroupsKey]: groups }, function () {
      displayGroupsAndPages1();
      displayGroupsAndPages2();
      updateGroupSelect1();
      updateGroupSelect2();
    });
  });
}

function showGroupContextMenu(event, groupTitle, group, storagePagesKey, storageGroupsKey) {
  const existingContextMenu = document.getElementById('context-menu');
  if (existingContextMenu) {
    document.body.removeChild(existingContextMenu);
  }

  const contextMenu = document.createElement('div');
  contextMenu.id = 'context-menu';
  contextMenu.style.position = 'absolute';
  contextMenu.style.top = `${event.pageY}px`;
  contextMenu.style.left = `${event.pageX}px`;
  contextMenu.style.backgroundColor = '#ecf0f1';
  contextMenu.style.padding = '10px';
  contextMenu.style.borderRadius = '5px';
  contextMenu.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';

  const editOption = document.createElement('div');
  editOption.textContent = 'Edit Group';
  editOption.style.cursor = 'pointer';
  editOption.addEventListener('click', () => {
    groupTitle.contentEditable = true;
    groupTitle.focus();
    document.body.removeChild(contextMenu);
  });

  const deleteOption = document.createElement('div');
  deleteOption.textContent = 'Delete Group';
  deleteOption.className = 'delete-option';
  deleteOption.style.cursor = 'pointer';
  deleteOption.addEventListener('click', () => {
    showDeleteConfirmation(group, storagePagesKey, storageGroupsKey);
    document.body.removeChild(contextMenu);
  });

  contextMenu.appendChild(editOption);
  contextMenu.appendChild(deleteOption);
  document.body.appendChild(contextMenu);

  document.addEventListener('click', () => {
    if (document.body.contains(contextMenu)) {
      document.body.removeChild(contextMenu);
    }
  }, { once: true });

  groupTitle.addEventListener('blur', () => {
    groupTitle.contentEditable = false;
    editGroupName(group, groupTitle.textContent, storagePagesKey, storageGroupsKey);
  });
}

function exportPages1() {
  exportPages('pages1');
}

function exportPages2() {
  exportPages('pages2');
}

function exportPages(storagePagesKey) {
  chrome.storage.local.get({ [storagePagesKey]: [] }, function (result) {
    const pages = result[storagePagesKey];
    let csvContent = "data:text/csv;charset=utf-8,Group,Title,URL\n";

    pages.forEach(page => {
      const row = `${page.group},"${page.title}",${page.url}`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "saved_pages.csv");
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);
  });
}

function showDeleteConfirmation(group, storagePagesKey, storageGroupsKey) {
  const confirmationDialog = document.createElement('div');
  confirmationDialog.id = 'confirmation-dialog';
  confirmationDialog.style.position = 'fixed';
  confirmationDialog.style.top = '50%';
  confirmationDialog.style.left = '50%';
  confirmationDialog.style.transform = 'translate(-50%, -50%)';
  confirmationDialog.style.backgroundColor = '#ecf0f1';
  confirmationDialog.style.padding = '20px';
  confirmationDialog.style.borderRadius = '10px';
  confirmationDialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  confirmationDialog.innerHTML = `
    <p class="confirmation-text">Are you sure you want to delete this group and all its items? This action can't be undone.</p>
    <button id="confirm-delete" class="delete-button">Delete</button>
    <button id="cancel-delete" class="cancel-button">Cancel</button>
  `;

  document.body.appendChild(confirmationDialog);

  document.getElementById('confirm-delete').addEventListener('click', () => {
    deleteGroup(group, storagePagesKey, storageGroupsKey);
    document.body.removeChild(confirmationDialog);
  });

  document.getElementById('cancel-delete').addEventListener('click', () => {
    document.body.removeChild(confirmationDialog);
  });
}

function changeColorScheme1() {
  changeColorScheme('style-button-1');
}

function changeColorScheme2() {
  changeColorScheme('style-button-2');
}

function changeColorScheme(styleButtonId) {
  const selectedScheme = document.getElementById(styleButtonId).value;
  document.body.className = selectedScheme;
  chrome.storage.local.set({ colorScheme: selectedScheme });
}

function loadColorScheme() {
  chrome.storage.local.get('colorScheme', function (result) {
    if (result.colorScheme) {
      document.body.className = result.colorScheme;
      document.getElementById('style-button-1').value = result.colorScheme;
      document.getElementById('style-button-2').value = result.colorScheme;
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  displayGroupsAndPages1();
  displayGroupsAndPages2();
  updateGroupSelect1();
  updateGroupSelect2();
  loadColorScheme();
});
