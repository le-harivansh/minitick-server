import { INestApplication } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, Types } from 'mongoose';

import { Task, TaskDocument, TaskSchema } from './schema/task.schema';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let application: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  let taskService: TaskService;
  let taskModel: Model<TaskDocument>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          async useFactory() {
            mongoMemoryServer = await MongoMemoryServer.create();

            return { uri: mongoMemoryServer.getUri() };
          },
        }),
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
      ],
      providers: [TaskService],
    }).compile();

    application = moduleFixture.createNestApplication();
    taskService = moduleFixture.get<TaskService>(TaskService);

    taskModel = application.get<Model<TaskDocument>>(getModelToken(Task.name));

    await application.init();
  });

  afterEach(async () => {
    await taskModel.deleteMany();
  });

  afterAll(async () => {
    await application.close();
    await mongoMemoryServer.stop();
  });

  describe('create', () => {
    it('adds a new task to the database', () => {
      const userId = new ObjectId().toString();
      const taskTitle = 'Task #1';

      expect(taskService.create(userId, taskTitle)).resolves.toMatchObject({
        userId,
        title: taskTitle,
      });
    });
  });

  describe('findOne', () => {
    const userId = new ObjectId().toString();
    const tasks: (TaskDocument & { _id: Types.ObjectId })[] = [];

    beforeEach(async () => {
      for (const taskTitle of ['Task #001', 'Task #002']) {
        tasks.push(await taskModel.create({ userId, title: taskTitle }));
      }
    });

    it('returns the specified task if it exists', async () => {
      const task = tasks[0];
      const retrievedTask = await taskService.findOne(task._id);

      expect(task._id).toStrictEqual(retrievedTask._id);
    });

    it('returns null if the specified task does not exist', () => {
      expect(
        taskService.findOne(new ObjectId().toString()),
      ).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    const userId = new ObjectId().toString();
    const tasks = ['Task #1', 'Task #2', 'Task #3'];

    beforeEach(async () => {
      for (const taskTitle of tasks) {
        await taskModel.create({ userId, title: taskTitle });
      }
    });

    it('returns all the tasks associated to the specified userId', async () => {
      const tasksFound = await taskService.findAll(userId);

      expect(tasksFound.map(({ title }) => title)).toStrictEqual(tasks);
    });
  });

  describe('update', () => {
    let taskId: string;

    beforeEach(async () => {
      taskId = (
        await taskModel.create({
          userId: new ObjectId().toString(),
          title: 'Task #1010',
        })
      )._id;
    });

    it('returns the updated task', async () => {
      const updateData: Partial<Omit<Task, 'userId'>> = {
        title: 'New Title',
        isComplete: true,
      };

      expect(taskService.update(taskId, updateData)).resolves.toMatchObject({
        _id: taskId,
        ...updateData,
      });
    });
  });

  describe('remove', () => {
    let taskId: string;

    beforeEach(async () => {
      taskId = (
        await taskModel.create({
          userId: new ObjectId().toString(),
          title: 'Task #2020',
        })
      )._id;
    });

    it('removes the specified task', async () => {
      await taskService.remove(taskId);

      expect(taskModel.findById(taskId).exec()).resolves.toBeNull();
    });
  });

  describe('removeForUser', () => {
    const userId = new ObjectId().toString();

    beforeEach(async () => {
      for (const title of ['Task #000', 'Task #001']) {
        await taskModel.create({ userId, title });
      }
    });

    it("removes all the associated user's tasks", async () => {
      await taskService.removeForUser(userId);

      expect(taskModel.find({ userId }).exec()).resolves.toStrictEqual([]);
    });
  });
});
