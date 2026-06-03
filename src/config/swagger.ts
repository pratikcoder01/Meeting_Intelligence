import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJSDoc.Options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Meeting Intelligence Service API',
      version: '1.0.0',
      description:
        'Interactive REST API documentation for the Meeting Intelligence Service. Includes user registration, JWT authentication, meeting scheduling, transcript uploads, action items, and background reminder tracking.',
    },
    servers: [
      {
        url: '/',
        description: 'Server base path',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT authorization header using the Bearer scheme. Enter your token in the input box.',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          required: ['traceId', 'success', 'data'],
          properties: {
            traceId: {
              type: 'string',
              format: 'uuid',
              example: 'd3b07384-d113-4c9f-b98a-7230559e19d7',
            },
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          required: ['traceId', 'success', 'error'],
          properties: {
            traceId: {
              type: 'string',
              format: 'uuid',
              example: 'd3b07384-d113-4c9f-b98a-7230559e19d7',
            },
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: {
                  type: 'string',
                  example: 'BAD_REQUEST',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data or failed verification.',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string', example: 'email' },
                      message: { type: 'string', example: 'Must be a valid email address' },
                    },
                  },
                },
              },
            },
          },
        },
        UserPublic: {
          type: 'object',
          required: ['userId', 'name', 'email', 'role', 'createdAt'],
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              example: 'e3df8d34-d021-4f9e-a021-3951239f112e',
            },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
            role: {
              type: 'string',
              enum: ['ADMIN', 'MANAGER', 'MEMBER', 'GUEST'],
              example: 'MEMBER',
            },
            createdAt: { type: 'string', format: 'date-time', example: '2026-06-03T10:13:52Z' },
          },
        },
        Meeting: {
          type: 'object',
          required: [
            'id',
            'title',
            'participants',
            'meetingDate',
            'createdBy',
            'status',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string', format: 'uuid', example: '9a9e3d8f-cf22-4911-a8cf-3942385ff21e' },
            title: { type: 'string', example: 'Project Kickoff' },
            participants: {
              type: 'array',
              items: { type: 'string', format: 'email', example: 'alice@example.com' },
            },
            meetingDate: { type: 'string', format: 'date-time', example: '2026-06-03T14:00:00Z' },
            createdBy: {
              type: 'string',
              format: 'uuid',
              example: 'e3df8d34-d021-4f9e-a021-3951239f112e',
            },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
              example: 'SCHEDULED',
            },
            createdAt: { type: 'string', format: 'date-time', example: '2026-06-03T10:13:52Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-06-03T10:13:52Z' },
          },
        },
        TranscriptLine: {
          type: 'object',
          required: ['id', 'meetingId', 'timestamp', 'speaker', 'text', 'order'],
          properties: {
            id: { type: 'string', format: 'uuid', example: 'bc94f31d-b873-41e9-9cd3-4e32d5f02e11' },
            meetingId: {
              type: 'string',
              format: 'uuid',
              example: '9a9e3d8f-cf22-4911-a8cf-3942385ff21e',
            },
            timestamp: { type: 'string', format: 'date-time', example: '2026-06-03T14:02:10Z' },
            speaker: { type: 'string', example: 'Alice' },
            text: { type: 'string', example: 'Let us start by defining the milestones.' },
            order: { type: 'integer', example: 0 },
          },
        },
        MeetingWithTranscript: {
          allOf: [
            { $ref: '#/components/schemas/Meeting' },
            {
              type: 'object',
              properties: {
                transcriptLines: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TranscriptLine' },
                },
              },
            },
          ],
        },
        ActionItem: {
          type: 'object',
          required: [
            'id',
            'meetingId',
            'task',
            'assignee',
            'assigneeUserId',
            'dueDate',
            'status',
            'citations',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string', format: 'uuid', example: '7d3a82f1-4df2-4113-8cf1-e23a9d9481fe' },
            meetingId: {
              type: 'string',
              format: 'uuid',
              example: '9a9e3d8f-cf22-4911-a8cf-3942385ff21e',
            },
            task: { type: 'string', example: 'Deliver the wireframes for the user dashboard' },
            assignee: { type: 'string', example: 'alice@example.com' },
            assigneeUserId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: 'e3df8d34-d021-4f9e-a021-3951239f112e',
            },
            dueDate: { type: 'string', format: 'date-time', example: '2026-06-10T17:00:00Z' },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
              example: 'PENDING',
            },
            citations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  lineId: {
                    type: 'string',
                    format: 'uuid',
                    nullable: true,
                    example: 'bc94f31d-b873-41e9-9cd3-4e32d5f02e11',
                  },
                  text: {
                    type: 'string',
                    example: 'Alice: I can deliver the user dashboard wireframes next Wednesday.',
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-06-03T14:05:00Z',
                  },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time', example: '2026-06-03T10:13:52Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-06-03T10:13:52Z' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          summary: 'Service health check',
          description:
            'Liveness check that returns the current process status, environment details, and timestamp.',
          responses: {
            200: {
              description: 'Service is healthy.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              status: { type: 'string', example: 'UP' },
                              timestamp: {
                                type: 'string',
                                format: 'date-time',
                                example: '2026-06-03T10:13:52Z',
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/auth/register': {
        post: {
          summary: 'Register a new user',
          description: 'Creates a new user profile and returns access and refresh tokens.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'John Doe' },
                    email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
                    password: { type: 'string', format: 'password', example: 'P@ssword1' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'User created successfully.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              user: { $ref: '#/components/schemas/UserPublic' },
                              accessToken: {
                                type: 'string',
                                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                              },
                              refreshToken: {
                                type: 'string',
                                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                              },
                              expiresIn: { type: 'integer', example: 900 },
                              tokenType: { type: 'string', example: 'Bearer' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: {
              description: 'Validation failed.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
              },
            },
            409: {
              description: 'Email already exists.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
              },
            },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          summary: 'Log in with credentials',
          description:
            'Authenticates user email and password and returns access/refresh token pair.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
                    password: { type: 'string', format: 'password', example: 'P@ssword1' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Authenticated successfully.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              user: { $ref: '#/components/schemas/UserPublic' },
                              accessToken: {
                                type: 'string',
                                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                              },
                              refreshToken: {
                                type: 'string',
                                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                              },
                              expiresIn: { type: 'integer', example: 900 },
                              tokenType: { type: 'string', example: 'Bearer' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: {
              description: 'Invalid credentials.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
              },
            },
          },
        },
      },
      '/api/v1/meetings': {
        post: {
          security: [{ BearerAuth: [] }],
          summary: 'Create a meeting with transcript',
          description: 'Saves a new meeting and its transcript lines in a database transaction.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'participants', 'meetingDate', 'transcript'],
                  properties: {
                    title: { type: 'string', example: 'Project Kickoff' },
                    participants: {
                      type: 'array',
                      items: { type: 'string', format: 'email', example: 'alice@example.com' },
                    },
                    meetingDate: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-06-03T14:00:00Z',
                    },
                    transcript: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['timestamp', 'speaker', 'text'],
                        properties: {
                          timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2026-06-03T14:02:10Z',
                          },
                          speaker: { type: 'string', example: 'Alice' },
                          text: {
                            type: 'string',
                            example: 'Let us start by defining the milestones.',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Meeting and transcripts created.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/MeetingWithTranscript' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
              },
            },
          },
        },
        get: {
          security: [{ BearerAuth: [] }],
          summary: 'List meetings (paginated)',
          description:
            'Retrieves all meetings created by the user, paginated and optionally filtered.',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'] },
            },
            {
              name: 'from',
              in: 'query',
              description: 'ISO date filter start range',
              schema: { type: 'string', format: 'date-time' },
            },
            {
              name: 'to',
              in: 'query',
              description: 'ISO date filter end range',
              schema: { type: 'string', format: 'date-time' },
            },
          ],
          responses: {
            200: {
              description: 'Paginated list of meetings.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              data: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Meeting' },
                              },
                              total: { type: 'integer', example: 12 },
                              page: { type: 'integer', example: 1 },
                              limit: { type: 'integer', example: 10 },
                              totalPages: { type: 'integer', example: 2 },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/meetings/{id}': {
        get: {
          security: [{ BearerAuth: [] }],
          summary: 'Get meeting details',
          description:
            'Gets a single meeting by its ID along with its transcript lines in chronological order.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Meeting details.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/MeetingWithTranscript' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: {
              description: 'Meeting not found.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
              },
            },
          },
        },
      },
      '/api/v1/meetings/{id}/analyze': {
        post: {
          security: [{ BearerAuth: [] }],
          summary: 'Trigger AI meeting analysis',
          description:
            'Queue or request an AI evaluation and analysis of the meeting transcript to extract summary, action items, and key decisions.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            202: {
              description: 'Analysis requested/accepted.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              status: { type: 'string', example: 'PROCESSING' },
                              meetingId: { type: 'string', format: 'uuid' },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/action-items': {
        post: {
          security: [{ BearerAuth: [] }],
          summary: 'Create a manual action item',
          description: 'Creates a new action item under a specified meeting.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['meetingId', 'task', 'assignee', 'dueDate'],
                  properties: {
                    meetingId: {
                      type: 'string',
                      format: 'uuid',
                      example: '9a9e3d8f-cf22-4911-a8cf-3942385ff21e',
                    },
                    task: { type: 'string', example: 'Deliver user wireframes' },
                    assignee: { type: 'string', example: 'alice@example.com' },
                    dueDate: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-06-10T17:00:00Z',
                    },
                    citations: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['text', 'timestamp'],
                        properties: {
                          lineId: { type: 'string', format: 'uuid' },
                          text: { type: 'string', example: 'Alice: I can deliver wireframes.' },
                          timestamp: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Action item created.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/ActionItem' },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        get: {
          security: [{ BearerAuth: [] }],
          summary: 'List action items (paginated)',
          description:
            "Retrieves action items from the user's meetings, filtered optionally by status, assignee, or meeting ID.",
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
            },
            {
              name: 'assignee',
              in: 'query',
              description: 'Filter by assignee name/email',
              schema: { type: 'string' },
            },
            { name: 'meetingId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Paginated action items.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              data: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/ActionItem' },
                              },
                              total: { type: 'integer', example: 5 },
                              page: { type: 'integer', example: 1 },
                              limit: { type: 'integer', example: 10 },
                              totalPages: { type: 'integer', example: 1 },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/action-items/{id}/status': {
        patch: {
          security: [{ BearerAuth: [] }],
          summary: 'Update action item status',
          description:
            'Updates the lifecycle status of an action item. Authenticated user must own the meeting associated with the action item.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
                      example: 'IN_PROGRESS',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Status updated successfully.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/ActionItem' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: {
              description: 'Action item not found.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
              },
            },
          },
        },
      },
      '/api/v1/action-items/overdue': {
        get: {
          security: [{ BearerAuth: [] }],
          summary: 'List overdue action items',
          description: 'Gets all action items that are past their due date and not completed.',
          responses: {
            200: {
              description: 'List of overdue action items.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: {
                              allOf: [
                                { $ref: '#/components/schemas/ActionItem' },
                                {
                                  type: 'object',
                                  properties: {
                                    meeting: {
                                      type: 'object',
                                      properties: {
                                        title: { type: 'string', example: 'Project Kickoff' },
                                      },
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/evaluation': {
        get: {
          security: [{ BearerAuth: [] }],
          summary: 'Get action item metrics and evaluation data',
          description:
            'Calculates performance and metrics evaluation for current active action items.',
          responses: {
            200: {
              description: 'Evaluation metrics.',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessEnvelope' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'object',
                            properties: {
                              totalActionItems: { type: 'integer', example: 25 },
                              completedCount: { type: 'integer', example: 15 },
                              pendingCount: { type: 'integer', example: 6 },
                              inProgressCount: { type: 'integer', example: 4 },
                              overdueCount: { type: 'integer', example: 2 },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [], // Spec defined statically to prevent file reading overhead in production
};

export const swaggerSpec = swaggerJSDoc(options);
export { swaggerUi };
