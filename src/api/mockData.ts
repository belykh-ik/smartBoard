import { Board } from '../types';

export const mockBoardData: Board = {
  tasks: {
    'task-1': {
      id: 'task-1',
      title: 'CFT-12',
      description: 'Crash Unexpected token < in JSON at position 0',
      state: 'backlog',
      priority: 1,
      assignee: 'Lisa Evans',
      comments: [{ id: 'c1', content: 'This is critical', author: 'John', createdAt: '2023-04-01T10:00:00Z' }],
      createdAt: '2023-04-01T09:00:00Z',
      updatedAt: '2023-04-01T09:00:00Z'
    },
    'task-2': {
      id: 'task-2',
      title: 'New Task',
      description: 'New Task Short Description',
      state: 'backlog',
      priority: 2,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-02T09:00:00Z',
      updatedAt: '2023-04-02T09:00:00Z'
    },
    'task-3': {
      id: 'task-3',
      title: 'One More Example',
      description: 'One More Example Short Description',
      state: 'backlog',
      priority: 3,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-03T09:00:00Z',
      updatedAt: '2023-04-03T09:00:00Z'
    },
    'task-4': {
      id: 'task-4',
      title: 'CFT-6',
      description: 'DEV: Mise a disposition not working',
      state: 'pending',
      priority: 2,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-04T09:00:00Z',
      updatedAt: '2023-04-04T09:00:00Z'
    },
    'task-5': {
      id: 'task-5',
      title: 'New task',
      description: 'Journal: find locking solution',
      state: 'pending',
      priority: 3,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-05T09:00:00Z',
      updatedAt: '2023-04-05T09:00:00Z'
    },
    'task-6': {
      id: 'task-6',
      title: 'New task',
      description: 'Extract Tasks from JIRA into GSheets',
      state: 'inprogress',
      priority: 1,
      assignee: 'David Green',
      comments: [],
      createdAt: '2023-04-06T09:00:00Z',
      updatedAt: '2023-04-06T09:00:00Z'
    },
    'task-7': {
      id: 'task-7',
      title: 'CFT-18',
      description: 'Display always for repose "Statut de l\'execution de la fonction: "',
      state: 'inprogress',
      priority: 2,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-07T09:00:00Z',
      updatedAt: '2023-04-07T09:00:00Z'
    },
    'task-8': {
      id: 'task-8',
      title: 'CFT-11',
      description: 'Functions d\'administration',
      state: 'inprogress',
      priority: 3,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-08T09:00:00Z',
      updatedAt: '2023-04-08T09:00:00Z'
    },
    'task-9': {
      id: 'task-9',
      title: 'One Example',
      description: 'One Example Short Description',
      state: 'inprogress',
      priority: 2,
      assignee: 'Lisa Evans',
      comments: [{ id: 'c2', content: 'Need to check this', author: 'Sarah', createdAt: '2023-04-09T11:00:00Z' }],
      createdAt: '2023-04-09T09:00:00Z',
      updatedAt: '2023-04-09T09:00:00Z'
    },
    'task-10': {
      id: 'task-10',
      title: 'CFT-10',
      description: 'Lister: second click generates error',
      state: 'aprove',
      priority: 1,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-10T09:00:00Z',
      updatedAt: '2023-04-10T09:00:00Z'
    },
    'task-11': {
      id: 'task-11',
      title: 'CF-7',
      description: 'CSS regression on fieldset-container',
      state: 'aprove',
      priority: 2,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-11T09:00:00Z',
      updatedAt: '2023-04-11T09:00:00Z'
    },
    'task-12': {
      id: 'task-12',
      title: 'New task',
      description: 'Find a fast solution',
      state: 'aproved',
      priority: 1,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-12T09:00:00Z',
      updatedAt: '2023-04-12T09:00:00Z'
    },
    'task-13': {
      id: 'task-13',
      title: 'CFT-7',
      description: 'Journal: find locking solution',
      state: 'aproved',
      priority: 2,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-13T09:00:00Z',
      updatedAt: '2023-04-13T09:00:00Z'
    },
    'task-14': {
      id: 'task-14',
      title: 'New task',
      description: 'Journal: find locking solution',
      state: 'aproved',
      priority: 3,
      assignee: 'Lisa Evans',
      comments: [],
      createdAt: '2023-04-14T09:00:00Z',
      updatedAt: '2023-04-14T09:00:00Z'
    }
  },
  columns: {
    'backlog': {
      id: 'backlog',
      title: 'Backlog',
      taskIds: ['task-1', 'task-2', 'task-3']
    },
    'pending': {
      id: 'pending',
      title: 'Pending',
      taskIds: ['task-4', 'task-5']
    },
    'inprogress': {
      id: 'inprogress',
      title: 'Inprogress',
      taskIds: ['task-6', 'task-7', 'task-8', 'task-9']
    },
    'aprove': {
      id: 'aprove',
      title: 'Aprove',
      taskIds: ['task-10', 'task-11']
    },
    'aproved': {
      id: 'aproved',
      title: 'Aproved',
      taskIds: ['task-12', 'task-13', 'task-14']
    },
    'done': {
      id: 'done',
      title: 'Done',
      taskIds: []
    }
  },
  columnOrder: ['backlog', 'pending', 'inprogress', 'aprove', 'aproved', 'done']
};