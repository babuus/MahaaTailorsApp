import React from 'react';
import { render } from '@testing-library/react-native';
import ValidationErrorDisplay, { 
  FieldValidationError, 
  FormValidationSummary, 
  ValidationStatus 
} from '../ValidationErrorDisplay';
import { FormValidationState } from '../../types';

describe('ValidationErrorDisplay', () => {
  it('renders validation errors for touched fields', () => {
    const errors = {
      name: 'Name is required',
      phone: 'Invalid phone number',
      email: 'Invalid email format',
    };
    const touched = {
      name: true,
      phone: true,
      email: false,
    };

    const { getByText, queryByText } = render(
      <ValidationErrorDisplay
        errors={errors}
        touched={touched}
      />
    );

    expect(getByText('Name is required')).toBeTruthy();
    expect(getByText('Invalid phone number')).toBeTruthy();
    expect(queryByText('Invalid email format')).toBeNull();
  });

  it('shows all errors when showAllErrors is true', () => {
    const errors = {
      name: 'Name is required',
      phone: 'Invalid phone number',
      email: 'Invalid email format',
    };
    const touched = {
      name: true,
      phone: false,
      email: false,
    };

    const { getByText } = render(
      <ValidationErrorDisplay
        errors={errors}
        touched={touched}
        showAllErrors={true}
      />
    );

    expect(getByText('Name is required')).toBeTruthy();
    expect(getByText('Invalid phone number')).toBeTruthy();
    expect(getByText('Invalid email format')).toBeTruthy();
  });

  it('renders nothing when no errors', () => {
    const { queryByText } = render(
      <ValidationErrorDisplay
        errors={{}}
        touched={{}}
      />
    );

    expect(queryByText(/./)).toBeNull();
  });
});

describe('FieldValidationError', () => {
  it('shows error when field is touched and has error', () => {
    const { getByText } = render(
      <FieldValidationError
        error="Field is required"
        touched={true}
      />
    );

    expect(getByText('Field is required')).toBeTruthy();
  });

  it('does not show error when field is not touched', () => {
    const { queryByText } = render(
      <FieldValidationError
        error="Field is required"
        touched={false}
      />
    );

    // The component renders a space character when no error should be shown
    expect(queryByText('Field is required')).toBeNull();
  });

  it('does not show error when visible is false', () => {
    const { queryByText } = render(
      <FieldValidationError
        error="Field is required"
        touched={true}
        visible={false}
      />
    );

    // The component renders a space character when no error should be shown
    expect(queryByText('Field is required')).toBeNull();
  });
});

describe('FormValidationSummary', () => {
  it('renders validation summary with errors', () => {
    const validationState: FormValidationState = {
      isValid: false,
      errors: {
        name: 'Name is required',
        phone: 'Invalid phone number',
        email: 'Invalid email format',
      },
      touched: {
        name: true,
        phone: true,
        email: false,
      },
    };

    const { getByText, queryByText } = render(
      <FormValidationSummary validationState={validationState} />
    );

    expect(getByText('Please fix the following errors:')).toBeTruthy();
    expect(getByText('Name is required')).toBeTruthy();
    expect(getByText('Invalid phone number')).toBeTruthy();
    expect(queryByText('Invalid email format')).toBeNull();
  });

  it('renders nothing when no touched errors', () => {
    const validationState: FormValidationState = {
      isValid: false,
      errors: {
        name: 'Name is required',
      },
      touched: {
        name: false,
      },
    };

    const { queryByText } = render(
      <FormValidationSummary validationState={validationState} />
    );

    expect(queryByText('Please fix the following errors:')).toBeNull();
  });

  it('renders custom title', () => {
    const validationState: FormValidationState = {
      isValid: false,
      errors: {
        name: 'Name is required',
      },
      touched: {
        name: true,
      },
    };

    const { getByText } = render(
      <FormValidationSummary 
        validationState={validationState}
        title="Custom error title:"
      />
    );

    expect(getByText('Custom error title:')).toBeTruthy();
  });
});

describe('ValidationStatus', () => {
  it('shows validating status', () => {
    const { getByText } = render(
      <ValidationStatus
        isValid={false}
        hasErrors={false}
        isValidating={true}
      />
    );

    expect(getByText('Validating...')).toBeTruthy();
  });

  it('shows error status when has errors', () => {
    const { getByText } = render(
      <ValidationStatus
        isValid={false}
        hasErrors={true}
        isValidating={false}
      />
    );

    expect(getByText('❌ Please fix errors above')).toBeTruthy();
  });

  it('shows valid status when valid', () => {
    const { getByText } = render(
      <ValidationStatus
        isValid={true}
        hasErrors={false}
        isValidating={false}
      />
    );

    expect(getByText('✅ All fields are valid')).toBeTruthy();
  });

  it('renders nothing when not validating, no errors, and not valid', () => {
    const { queryByText } = render(
      <ValidationStatus
        isValid={false}
        hasErrors={false}
        isValidating={false}
      />
    );

    expect(queryByText(/./)).toBeNull();
  });
});