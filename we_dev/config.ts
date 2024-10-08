import { defineConfig } from '@theweave/cli';

export default defineConfig({
  groups: [
    {
      name: 'Lightning Rod Labs',
      networkSeed: '098rc1m-09384u-crm-29384u-cmkj',
      icon: {
        type: 'filesystem',
        path: './we_dev/lrl-icon.png',
      },
      creatingAgent: {
        agentIdx: 1,
        agentProfile: {
          nickname: 'Zippy',
          avatar: {
            type: 'filesystem',
            path: './we_dev/zippy.jpg',
          },
        },
      },
      joiningAgents: [
        {
          agentIdx: 2,
          agentProfile: {
            nickname: 'Zerbina',
            avatar: {
              type: 'filesystem',
              path: './we_dev/zerbina.jpg',
            },
          },
        },
      ],
      applets: [
        {
          name: 'KanDo Hot Reload',
          instanceName: 'KanDo Hot Reload',
          registeringAgent: 1,
          joiningAgents: [2],
        },
        // {
        //   name: 'gamez',
        //   instanceName: 'gamez',
        //   registeringAgent: 1,
        //   joiningAgents: [2],
        // },
        // {
        //   name: 'notebooks',
        //   instanceName: 'notebooks',
        //   registeringAgent: 1,
        //   joiningAgents: [2],
        // },
      ],
    },
  ],
  applets: [
    {
      name: 'KanDo Hot Reload',
      subtitle: 'KanDo',
      description: 'task it it!',
      icon: {
        type: 'filesystem',
        path: './we_dev/kando_icon.png',
      },
      source: {
        type: 'localhost',
        happPath: './workdir/kando.happ',
        uiPort: 1420,
      },
    },
    // {
    //     name: 'gamez',
    //     subtitle: 'play!',
    //     description: 'Real-time games based on syn',
    //     icon: {
    //       type: "https",
    //       url: "https://raw.githubusercontent.com/holochain-apps/gamez/main/we_dev/gamez_icon.svg"
    //     },
    //     source: {
    //       type: "https",
    //       url: "https://github.com/holochain-apps/gamez/releases/download/v0.3.100/gamez.webhapp"
    //     },
    //   },
    //   {
    //   name: 'notebooks',
    //   subtitle: 'Collaborative note taking',
    //   description: 'Real-time notetaking based on syn',
    //   icon: {
    //     type: 'https',
    //     url: 'https://lightningrodlabs.org/projects/notebooks_logo.svg',
    //   },
    //   source: {
    //     type: 'https',
    //     url: 'https://github.com/lightningrodlabs/notebooks/releases/download/v0.2.0/notebooks.webhapp',
    //   },
    // },
  ],
});