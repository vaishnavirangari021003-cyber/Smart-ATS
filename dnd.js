/**
 * HireFlow Drag-and-Drop Controller (dnd.js)
 * Implements HTML5 Drag and Drop API with full keyboard accessibility fallback
 * and live screen reader ARIA announcements.
 */

import { showToast } from './ui.js';

export class KanbanDnD {
  /**
   * @param {Object} options 
   * @param {Function} options.onMove (cardId, targetStage) => Promise<boolean>
   * @param {Function} options.getAllowedStages (currentStage) => string[]
   */
  constructor(options = {}) {
    this.onMove = options.onMove || null;
    this.getAllowedStages = options.getAllowedStages || (() => []);
    this.draggedCard = null;
    this.liveAnnouncer = null;
    this.initAnnouncer();
  }

  initAnnouncer() {
    this.liveAnnouncer = document.getElementById('kanban-live-announcer');
    if (!this.liveAnnouncer) {
      this.liveAnnouncer = document.createElement('div');
      this.liveAnnouncer.id = 'kanban-live-announcer';
      this.liveAnnouncer.className = 'sr-only';
      this.liveAnnouncer.setAttribute('aria-live', 'assertive');
      this.liveAnnouncer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.liveAnnouncer);
    }
  }

  announce(text) {
    if (this.liveAnnouncer) {
      this.liveAnnouncer.textContent = text;
    }
  }

  /**
   * Bind drag and drop events to board container
   * @param {HTMLElement} boardEl 
   */
  bind(boardEl) {
    if (!boardEl) return;

    // Delegate dragstart
    boardEl.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.kanban-card');
      if (!card) return;

      this.draggedCard = card;
      card.classList.add('is-dragging');
      const cardId = card.getAttribute('data-id');
      const currentStage = card.getAttribute('data-stage');
      const cardName = card.querySelector('.kanban-card-title')?.textContent || 'Candidate';

      e.dataTransfer.setData('text/plain', JSON.stringify({ cardId, currentStage }));
      e.dataTransfer.effectAllowed = 'move';
      this.announce(`Started dragging ${cardName} from ${currentStage}`);
    });

    // Delegate dragend
    boardEl.addEventListener('dragend', (e) => {
      const card = e.target.closest('.kanban-card');
      if (card) {
        card.classList.remove('is-dragging');
      }
      this.draggedCard = null;
      boardEl.querySelectorAll('.kanban-card-list').forEach(col => col.classList.remove('drag-over'));
    });

    // Dragover on columns
    boardEl.addEventListener('dragover', (e) => {
      const list = e.target.closest('.kanban-card-list');
      if (!list) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      list.classList.add('drag-over');
    });

    // Dragleave on columns
    boardEl.addEventListener('dragleave', (e) => {
      const list = e.target.closest('.kanban-card-list');
      if (!list) return;
      if (!list.contains(e.relatedTarget)) {
        list.classList.remove('drag-over');
      }
    });

    // Drop on column list
    boardEl.addEventListener('drop', async (e) => {
      const list = e.target.closest('.kanban-card-list');
      if (!list) return;
      e.preventDefault();
      list.classList.remove('drag-over');

      const col = list.closest('.kanban-column');
      const targetStage = col ? col.getAttribute('data-stage') : null;
      if (!targetStage || !this.draggedCard) return;

      const cardId = this.draggedCard.getAttribute('data-id');
      const currentStage = this.draggedCard.getAttribute('data-stage');
      const candidateName = this.draggedCard.querySelector('.kanban-card-title')?.textContent || 'Candidate';

      if (currentStage === targetStage) return;

      const allowed = this.getAllowedStages(currentStage);
      if (!allowed.includes(targetStage)) {
        showToast(`Cannot move from ${currentStage} directly to ${targetStage}. Check pipeline rules.`, 'error');
        this.announce(`Invalid move: cannot move ${candidateName} to ${targetStage}`);
        return;
      }

      if (this.onMove) {
        const success = await this.onMove(cardId, targetStage);
        if (success) {
          this.announce(`Successfully moved ${candidateName} to ${targetStage}`);
        }
      }
    });
  }

  /**
   * Attach keyboard accessible "Move to..." controls to a card
   * @param {HTMLElement} cardEl 
   * @param {string[]} allowedStages 
   */
  attachKeyboardMenu(cardEl, allowedStages = []) {
    const actionBtn = cardEl.querySelector('[data-action="move-menu"]');
    if (!actionBtn) return;

    actionBtn.onclick = (e) => {
      e.stopPropagation();
      // Close other open menus
      document.querySelectorAll('.dropdown.is-open').forEach(d => d.classList.remove('is-open'));

      const dropdown = actionBtn.closest('.dropdown');
      if (dropdown) {
        dropdown.classList.toggle('is-open');
      }
    };
  }
}
