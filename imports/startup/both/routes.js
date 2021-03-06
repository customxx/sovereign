import { Router } from 'meteor/iron:router';
import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { TAPi18n } from 'meteor/tap:i18n';
import web3 from 'web3';

import { gui } from '/lib/const';
import { urlDoctor } from '/lib/utils';
import { query } from '/lib/views';

import { Contracts } from '/imports/api/contracts/Contracts';
import { stripHTMLfromText } from '/imports/ui/modules/utils';
import { displayNotice } from '/imports/ui/modules/notice';
import { Collectives } from '/imports/api/collectives/Collectives';
import { updateMenu } from '/imports/ui/modules/menu';


if (Meteor.isClient) {
  import '/imports/ui/templates/layout/main.js';
  import '/imports/ui/templates/layout/url/home/home.js';
  import '/imports/ui/templates/layout/url/notFound/notFound.js';
  import '/imports/ui/templates/layout/load/load.js';
  import '/imports/ui/templates/components/identity/login/login.js';
  import '/imports/ui/templates/components/identity/card/card.js';
  import '/imports/ui/templates/components/decision/contract/contract.js';
  import '/imports/ui/templates/widgets/feed/feed.js';

  Router.plugin('reywood:iron-router-ga');
}

/**
* @summary writes meta tags in HTML page
* @param {object} tag includes a key value for each tag
* @param {boolean} includeTitle if including title on head is required
*/
const _meta = (tag, includeTitle) => {
  if (Meteor.isServer) {
    let head = `
      <meta name="description" content="${tag.description}">
      <meta property="og:title" content="${tag.title}">
      <meta property="og:description" content="${tag.description}">
      <meta property="og:image" content="${tag.image}">
      <meta property="twitter:card" content="${tag.description}">
      <meta name="twitter:card" content='summary'>
      <meta name="twitter:site" content="${tag.twitter}">
      <meta name="twitter:title" content="${tag.title}">
      <meta name="twitter:description" content="${tag.description}">
      <meta name="twitter:image" content="${tag.image}">
      <meta property="fb:app_id" content="${tag.facebookId}">
      `;

    if (includeTitle) {
      head += `
        <title>${tag.title}</title>
      `;
    }
    return head;
  }
  DocHead.addMeta({ name: 'description', content: tag.description });
  DocHead.addMeta({ property: 'og:title', content: tag.title });
  DocHead.addMeta({ property: 'og:description', content: tag.description });
  DocHead.addMeta({ property: 'og:image', content: tag.image });
  DocHead.addMeta({ property: 'twitter:card', content: tag.description });
  DocHead.addMeta({ name: 'twitter:card', content: 'summary' });
  DocHead.addMeta({ name: 'twitter:site', content: tag.twitter });
  DocHead.addMeta({ name: 'twitter:title', content: tag.title });
  DocHead.addMeta({ name: 'twitter:description', content: tag.description });
  DocHead.addMeta({ name: 'twitter:image', content: tag.image });
  DocHead.addMeta({ property: 'fb:app_id', content: tag.facebookId });
  return '';
};

/**
* @summary resets session variables
*/
const _reset = async () => {
  Session.set('castSingleVote', undefined);
  Session.set('newLogin', false);
  updateMenu(Router.current().params.dao ? Router.current().params.dao : '');
};

/**
* @summary default meta tags
*/
const _boilerPlate = () => {
  DocHead.removeDocHeadAddedTags();
  DocHead.setTitle(`${Meteor.settings.public.app.name} - ${Meteor.settings.public.app.bio}`);

  _meta({
    title: `${Meteor.settings.public.app.name} - ${Meteor.settings.public.app.bio}`,
    description: Meteor.settings.public.app.bio,
    image: `${urlDoctor(Meteor.absoluteUrl.defaultOptions.rootUrl)}${Meteor.settings.public.app.logo}`,
    twitter: Meteor.settings.public.app.twitter,
  });
};

/*
* router settings
*/
Router.configure({
  layoutTemplate: 'main',
  loadingTemplate: 'load',
  notFoundTemplate: 'notFound',
  controller: 'PreloadController',
  trackPageView: true,
  preload: {
    verbose: false,
    timeOut: 5000,
    sync: Meteor.settings.public.web.template.settings,
    onSync: () => {
      return true;
    },
  },
});


/**
* @summary home route
*/
Router.route('/', {
  name: 'home',
  template: 'home',
  loadingTemplate: 'load',
  onBeforeAction() {
    _reset();
    this.next();
  },
  data() {
    let limit = gui.ITEMS_PER_PAGE;
    if (!Meteor.user()) {
      limit = gui.ITEMS_IN_LANDING;
    }

    let view = 'latest';
    let period = '';
    let search = '';
    if (this.params.query.period) {
      view = 'period';
      period = this.params.query.period;
    } else if (this.params.query.search) {
      view = 'search';
      search = this.params.query.search;
    }

    return {
      options: { view, period, search, sort: { timestamp: -1 }, limit, skip: 0 },
    };
  },
  onAfterAction() {
    _boilerPlate();
  },
});


/**
* @summary loads a peer feed from @
**/
Router.route('/address/:username', {
  name: 'at',
  template: 'home',
  onBeforeAction() {
    Session.set('sidebarMenuSelectedId', 999);
    _reset();
    this.next();
  },
  data() {
    return {
      options: { view: 'peer', sort: { timestamp: -1 }, limit: gui.ITEMS_PER_PAGE, skip: 0, username: this.params.username },
    };
  },
  onAfterAction() {
    const user = Meteor.users.findOne({ username: this.params.username });
    let title;
    let description;
    let image;
    DocHead.removeDocHeadAddedTags();

    if (user) {
      title = `${TAPi18n.__('profile-tag-title').replace('{{user}}', `${user.username}`).replace('{{collective}}', Meteor.settings.public.app.name)}`;
      description = `${user.username}${TAPi18n.__('profile-tag-description')} ${Meteor.settings.public.app.name}`;
      image = `${Router.path('home')}${user.profile.picture}`;
    } else {
      title = `${TAPi18n.__('profile-tag-title').replace('{{user}}', `${this.params.username}`).replace('{{collective}}', Meteor.settings.public.app.name)}`;
      description = `${this.params.username} ${TAPi18n.__('profile-tag-description')} ${Meteor.settings.public.app.name}`;
      image = `${urlDoctor(Meteor.absoluteUrl.defaultOptions.rootUrl)}${Meteor.settings.public.app.logo}`;
    }

    DocHead.setTitle(title);

    _meta({
      title,
      description,
      image,
      twitter: Meteor.settings.public.app.twitter,
    });
  },
});

/**
* @summary loads a peer feed from @
**/
Router.route('/dao/:dao', {
  name: 'dao',
  template: 'home',
  onBeforeAction() {
    Session.set('sidebarMenuSelectedId', 999);
    _reset();
    this.next();
  },
  waitOn() {
    if (web3.utils.isAddress(this.params.dao)) {
      return Meteor.subscribe('collectives', { view: 'addressDao', publicAddress: this.params.dao.toLowerCase() });
    }
    return Meteor.subscribe('collectives', { view: 'singleDao', uri: this.params.dao });
  },
  data() {
    let period = '';
    if (this.params.query.period) {
      period = this.params.query.period;
    }

    if (this.ready()) {
      const parameters = query({ view: 'addressDao', publicAddress: this.params.dao });
      const collective = Collectives.findOne(parameters.find);

      return {
        options: { view: 'dao', period, collectiveId: collective._id, sort: { timestamp: -1 }, limit: gui.ITEMS_PER_PAGE, skip: 0, name: collective.name },
      };
    }
    return {};
  },
  onAfterAction() {
    let title;
    let description;
    let image;
    DocHead.removeDocHeadAddedTags();

    if (this.ready()) {
      const parameters = query({ view: 'addressDao', publicAddress: this.params.dao });
      const collective = Collectives.findOne(parameters.find);

      if (collective && collective.name) {
        title = `${TAPi18n.__('collective-dao-title').replace('{{dao}}', `${collective.name}`)}`;
        description = `${TAPi18n.__('collective-dao-description').replace('{{dao}}', collective.name)}`;
        image = `${Router.path('home')}${collective.profile.logo}`;
      }
    } else {
      title = `${TAPi18n.__('collective-dao-title').replace('{{dao}}', `${this.params.dao}`)}`;
      description = `${TAPi18n.__('collective-dao-description').replace('{{dao}}', this.params.dao)}`;
      image = `${urlDoctor(Meteor.absoluteUrl.defaultOptions.rootUrl)}${Meteor.settings.public.app.logo}`;
    }

    DocHead.setTitle(title);

    _meta({
      title,
      description,
      image,
      twitter: Meteor.settings.public.app.twitter,
    });
  },
});


/**
* @summary loads a post using date in url
**/
Router.route('/date', {
  name: 'date',
  template: 'home',
  loadingTemplate: 'load',
  onBeforeAction() {
    Session.set('sidebarMenuSelectedId', 999);
    _reset();
    this.next();
  },
  waitOn() {
    return Meteor.subscribe('dateContracts', { view: 'dateRange', from: this.params.query.from, until: this.params.query.until });
  },
  data() {
    if (this.ready()) {
      return {
        options: { view: 'dateRange', from: this.params.query.from, until: this.params.query.until },
      };
    }
    return {};
  },
  onAfterAction() {
    _boilerPlate();
  },
});


/**
* @summary loads a post using date in url
**/
Router.route('/tx/:keyword', {
  name: 'ticket',
  template: 'home',
  loadingTemplate: 'load',
  onBeforeAction() {
    Session.set('sidebarMenuSelectedId', 999);
    _reset();
    this.next();
  },
  waitOn() {
    return Meteor.subscribe('singleContract', { view: 'post', keyword: this.params.keyword.toLowerCase() });
  },
  data() {
    if (this.ready()) {
      return {
        options: { view: 'post', sort: { timestamp: -1 }, keyword: this.params.keyword.toLowerCase() },
      };
    }
    return {};
  },
  onAfterAction() {
    let title;
    let description;
    let image;
    DocHead.removeDocHeadAddedTags();

    if (this.ready()) {
      const contract = Contracts.findOne({ keyword: this.params.keyword.toLowerCase() });

      if (contract) {
        DocHead.setTitle(`${TAPi18n.__('vote-tag-ballot-title').replace('{{collective}}', Meteor.settings.public.app.name)} - ${stripHTMLfromText(contract.title)}`);
        if (contract.ballotEnabled) {
          title = `${TAPi18n.__('vote-tag-ballot-title').replace('{{collective}}', Meteor.settings.public.app.name)}`;
        } else {
          title = `${TAPi18n.__('vote-tag-title').replace('{{collective}}', Meteor.settings.public.app.name)}`;
        }
        description = stripHTMLfromText(contract.title);
        image = `${urlDoctor(Meteor.absoluteUrl.defaultOptions.rootUrl)}${Meteor.settings.public.app.logo}`;
      }
    } else {
      title = `${Meteor.settings.public.app.name} - ${Meteor.settings.public.app.bio}`;
      description = Meteor.settings.public.app.bio;
      image = `${urlDoctor(Meteor.absoluteUrl.defaultOptions.rootUrl)}${Meteor.settings.public.app.logo}`;
    }

    DocHead.setTitle(title);

    _meta({
      title,
      description,
      image,
      twitter: Meteor.settings.public.app.twitter,
    });
  },
});

// Email routes
Router.route('/verify-email/:token', {
  name: 'verify-email',
  onBeforeAction() {
    _reset();
    Session.set('emailToken', this.params.token);
    this.next();
    Router.go('/');
  },
  onAfterAction() {
    _boilerPlate();
    displayNotice('email-verified', true);
  },
});

// Login
Router.route('/login', {
  name: 'login',
});

export const meta = _meta;
