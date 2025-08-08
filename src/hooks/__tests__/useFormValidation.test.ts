import { renderHook, act } from '@testing-library/react-native';
import { useFormValidation } from '../useFormValidation';
import { ValidationResult } from '../../types/validation';

// Mock validator function
const mockValidator = (data: any): ValidationResult => {
  const errors = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Name is required' });
  }
  
  if (!data.email || data.email.trim() === '') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!data.email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

describe('useFormValidation', () => {
  const initialData = {
    name: '',
    email: '',
  };

  it('initializes with correct default state', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialData,
        validator: mockValidator,
      })
    );

    expect(result.current.data).toEqual(initialData);
    expect(result.current.validation.isValid).toBe(true);
    expect(result.current.validation.errors).toEqual({});
    expect(result.current.validation.touched).toEqual({});
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.hasErrors).toBe(false);
  });

  it('updates form data correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialData,
        validator: mockValidator,
      })
    );

    act(() => {
      result.current.setData({ name: 'John Doe', email: 'john@example.com' });
    });

    expect(result.current.data.name).toBe('John Doe');
    expect(result.current.data.email).toBe('john@example.com');
    expect(result.current.isDirty).toBe(true);
  });

  it('updates individual fields correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialData,
        validator: mockValidator,
      })
    );

    act(() => {
      result.current.updateField('name', 'Jane Doe');
    });

    expect(result.current.data.name).toBe('Jane Doe');
    expect(result.current.isDirty).toBe(true);
    expect(result.current.isFieldTouched('name')).toBe(true);
  });

  it('validates form correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialData,
        validator: mockValidator,
      })
    );

    act(() => {
      const isValid = result.current.validateForm();
      expect(isValid).toBe(false);
    });

    expect(result.current.validation.isValid).toBe(false);
    expect(result.current.validation.errors.name).toBe('Name is required');
    expect(result.current.validation.errors.email).toBe('Email is required');
    expect(result.current.hasErrors).toBe(true);
  });

  it('validates individual fields correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialData: { name: 'John', email: 'invalid-email' },
        validator: mockValidator,
      })
    );

    act(() => {
      const isValid = result.current.validateField('email');
      expect(isValid).toBe(false);
    });

    expect(result.current.validation.errors.email).toBe('Invalid email format');
  });

  it('clears field errors correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialData,
        validator: mockValidator,
      })
    );

    // First validate to create errors
    act(() => {
      result.current.validateForm();
    });

    expect(result.current.validation.errors.name).toBe('Name is required');

    // Clear the error
    act(() => {
      result.current.clearFieldError('name');
    });

    expect(result.current.validation.errors.name).toBe('');
  });

  it('marks fields as touched correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialData,
        validator: mockValidator,
      })
    );

    act(() => {
      result.current.markFieldAsTouched('name');
    });

    expect(result.current.isFieldTouched('name')).toBe(true);
    expect(result.current.isFieldTouched('email')).toBe(false);
  });

  it('shows field errors only when touched', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialData,
        validator: mockValidator,
      })
    );

    // Validate form to create errors
    act(() => {
      result.current.validateForm();
    });

    // Mark only name as touched
    act(() => {
      result.current.markFieldAsTouched('name');
    });

    expect(result.current.shouldShowFieldError('name')).toBe(true);
    expect(result.current.shouldShowFieldError('email')).toBe(false);
  });

  it('resets form correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        initialData,
        validator: mockValidator,
      })
    );

    // Make changes
    act(() => {
      result.current.setData({ name: 'John', email: 'john@example.com' });
      result.current.validateForm();
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.hasErrors).toBe(false);

    // Reset form
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.data).toEqual(initialData);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.validation.isValid).toBe(true);
    expect(result.current.validation.errors).toEqual({});
    expect(result.current.validation.touched).toEqual({});
  });

  it('handles form submission correctly', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    
    const { result } = renderHook(() =>
      useFormValidation({
        initialData: { name: 'John', email: 'john@example.com' },
        validator: mockValidator,
        onSubmit,
      })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith({ name: 'John', email: 'john@example.com' });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('prevents submission when form is invalid', async () => {
    const onSubmit = jest.fn();
    
    const { result } = renderHook(() =>
      useFormValidation({
        initialData,
        validator: mockValidator,
        onSubmit,
      })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.validation.isValid).toBe(false);
  });
});