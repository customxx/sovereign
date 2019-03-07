import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';

import { editorFadeOut } from '/imports/ui/templates/components/decision/editor/editor';
import { createContract } from '/imports/startup/both/modules/Contract';
import { canUserComment } from '/lib/permissioned';
import { displayNotice } from '/imports/ui/modules/notice';

import '/imports/ui/templates/widgets/compose/compose.html';

/**
* @summary prepares the territory for editor display
*/
const _introEditor = (settings) => {
  let draft;
  if (!Session.get('showPostEditor')) {
    draft = createContract();
  } else {
    draft = Session.get('draftContract');
  }

  if (settings.replyMode || !Session.get('showPostEditor')) {
    if (settings.replyMode && settings.replyId) {
      draft.replyId = settings.replyId;
      draft.blockstackAppId = settings.blockstackAppId;
    } else {
      draft.replyId = '';
    }
    Session.set('draftContract', draft);
    Session.set('showPostEditor', true);
  } else if (!Meteor.Device.isPhone()) {
    editorFadeOut(Session.get('draftContract')._id);
  }
};

Template.compose.onRendered(() => {
  if (!Meteor.Device.isPhone()) {
    $('.action-label').css('opacity', 0);
    $('.action-label').css('overflow', 'hidden');
    $('.action-icon-mouseover').css('opacity', 0);
  }
});

Template.compose.onCreated(() => {
  const instance = Template.instance();

  if (Meteor.user() && instance.data.desktopMode) {
    _introEditor(instance.data);
  }
});

Template.compose.helpers({
  mouseActive() {
    if (!Meteor.Device.isPhone()) {
      return Session.get('showCompose');
    }
    return false;
  },
  proposalDrafting() {
    if (Meteor.settings.public.app.config.proposalDrafting === false) {
      return false;
    }
    return true;
  },
  editorMode() {
    return Session.get('showPostEditor');
  },
  displayCancel() {
    if (Session.get('showPostEditor') && !Meteor.Device.isPhone()) {
      return 'cast-cancel';
    }
    return '';
  },
  icon() {
    if (Session.get('showPostEditor') && !Meteor.Device.isPhone()) {
      return 'images/compose-cancel.png';
    }
    return 'images/compose.png';
  },
  enabled() {
    if (Meteor.user().emails && Meteor.user().emails[0].address === 'hello@democracy.earth' && Meteor.user().emails[0].verified === true) {
      return true;
    }
    return false;
  },
});

Template.compose.events({
  'click #action-hotspace'() {
    if (Meteor.Device.isPhone()) {
      const inputElement = document.getElementById('hiddenInput');
      inputElement.style.visibility = 'visible'; // unhide the input
      inputElement.focus(); // focus on it so keyboard pops
      inputElement.style.visibility = 'hidden'; // hide it again
    }
    _introEditor(this);
  },
});

Template.comment.helpers({
  buttonState() {
    const state = {
      label: TAPi18n.__('add-comment'),
      style: 'micro-button micro-button-feed micro-button-comment',
    };

    if (Session.get('showPostEditor') && !Meteor.Device.isPhone()) {
      state.label = TAPi18n.__('cancel-comment');
      state.style = 'micro-button micro-button-feed micro-button-comment micro-button-comment-cancel';
    }
    return state;
  },
});

Template.comment.events({
  'click #add-comment'() {
    if (Meteor.Device.isPhone()) {
      const inputElement = document.getElementById('hiddenInput');
      inputElement.style.visibility = 'visible'; // unhide the input
      inputElement.focus(); // focus on it so keyboard pops
      inputElement.style.visibility = 'hidden'; // hide it again
    }
    if (Meteor.user().emails && Meteor.user().emails[0].verified) {
      if (canUserComment(Meteor.user().emails[0].address, this.blockstackAppId)) {
        _introEditor(this);
      } else {
        displayNotice('whitelist-only', true);
      }
    } else {
      displayNotice('verified-email-only', true);
    }
  },
});
export const introEditor = _introEditor;
