import { HealthchecksService } from './healthchecks.service';
import { MeasuredHealthcheck } from './healthchecks.decorators';

jest.mock('./healthchecks.service', () => ({
  HealthchecksService: jest
    .fn()
    .mockImplementation(() => ({ measuredCheck: jest.fn() })),
}));

const measuredCheck = (HealthchecksService as jest.Mock).mock.results[0].value
  .measuredCheck as jest.Mock;

describe('MeasuredHealthcheck', () => {
  beforeEach(() => {
    measuredCheck.mockReset().mockImplementation(async (_opts, work) => work());
  });

  it('preserves method context, arguments, and return value', async () => {
    class Task {
      prefix = 'backup';
      @MeasuredHealthcheck({
        enabled: true,
        url: 'https://health.example.test/id',
      })
      async run(name: string, count: number) {
        return `${this.prefix}:${name}:${count}`;
      }
    }
    await expect(new Task().run('daily', 2)).resolves.toBe('backup:daily:2');
    expect(measuredCheck).toHaveBeenCalledWith(
      { url: 'https://health.example.test/id' },
      expect.any(Function),
    );
  });

  it('does not wrap disabled methods or call the healthcheck service', async () => {
    const original = jest.fn().mockResolvedValue('done');
    const descriptor = { value: original };
    MeasuredHealthcheck({ enabled: false, url: '' })({}, 'run', descriptor);
    expect(descriptor.value).toBe(original);
    await expect(descriptor.value()).resolves.toBe('done');
    expect(measuredCheck).not.toHaveBeenCalled();
  });

  it('propagates errors from decorated work', async () => {
    const error = new Error('Task failed');
    class Task {
      @MeasuredHealthcheck({
        enabled: true,
        url: 'https://health.example.test/id',
      })
      async run() {
        throw error;
      }
    }
    await expect(new Task().run()).rejects.toBe(error);
  });
});
