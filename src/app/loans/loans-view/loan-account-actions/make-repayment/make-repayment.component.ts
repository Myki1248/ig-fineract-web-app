/** Angular Imports */
import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

/** Custom Services */
import { LoansService } from 'app/loans/loans.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';

/**
 * Loan Make Repayment Component
 */
@Component({
  selector: 'mifosx-make-repayment',
  templateUrl: './make-repayment.component.html',
  styleUrls: ['./make-repayment.component.scss']
})
export class MakeRepaymentComponent implements OnInit {

  @Input() dataObject: any;
  /** Loan Id */
  loanId: string;
  /** Payment Type Options */
  paymentTypes: any;
  paymentCommandTypes: any;
  /** Show payment details */
  showPaymentDetails = false;
  /** Minimum Date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum Date allowed. */
  maxDate = new Date();
  repaymentdata: any;
  /** Repayment Loan Form */
  repaymentLoanForm: FormGroup;

  /**
   * @param {FormBuilder} formBuilder Form Builder.
   * @param {LoansService} loanService Loan Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {SettingsService} settingsService Settings Service
   */
  constructor(private formBuilder: FormBuilder,
    private loanService: LoansService,
    private route: ActivatedRoute,
    private router: Router,
    private dateUtils: Dates,
    private settingsService: SettingsService) {
      this.loanId = this.route.parent.snapshot.params['loanId'];
    }

  /**
   * Creates the repayment loan form
   * and initialize with the required values
   */
  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createRepaymentLoanForm();
    this.setRepaymentLoanDetails();
    this.onChanges();
  }

  /**
   * Creates the create close form.
   */
  createRepaymentLoanForm() {
    this.repaymentLoanForm = this.formBuilder.group({
      'transactionDate': [new Date(), Validators.required],
      'transactionAmount': ['', Validators.required],
      'externalId': '',
      'paymentTypeId': '',
      'paymentCommandTypeId': 'repayment',
      'note': '',
      'paymentTillDueDate': false,
    });
  }

  onChanges(): void {
    this.repaymentLoanForm.get('transactionDate').valueChanges.subscribe(val => {
      this.retrieveLoanRepaymentTemplate(val, this.repaymentLoanForm.value.paymentCommandTypeId);
    })
    this.repaymentLoanForm.get('paymentCommandTypeId').valueChanges.subscribe(val => {
      this.retrieveLoanRepaymentTemplate(this.repaymentLoanForm.value.transactionDate, val);
    })
  }

  setRepaymentLoanDetails() {
    this.paymentTypes = this.dataObject.paymentTypeOptions;
    this.paymentCommandTypes = [
      { 
        "id": "repayment",
        "name": "Repayment till today (disabled)",
      },
      {
        "id": "repayment-due-date",
        "name": "Repayment till due date"
      },
      {
        "id": "prepayloan",
        "name": "Part payment"
      },
      {
        "id": "principal-waive-off-closure",
        "name": "Principal waive off for closure"
      },
    ];
    this.repaymentLoanForm.patchValue({
      transactionAmount: this.dataObject.amount
    });
  }

  /**
   * Add payment detail fields to the UI.
   */
  addPaymentDetails() {
    this.showPaymentDetails = !this.showPaymentDetails;
    if (this.showPaymentDetails) {
      this.repaymentLoanForm.addControl('accountNumber', new FormControl(''));
      this.repaymentLoanForm.addControl('checkNumber', new FormControl(''));
      this.repaymentLoanForm.addControl('routingCode', new FormControl(''));
      this.repaymentLoanForm.addControl('receiptNumber', new FormControl(''));
      this.repaymentLoanForm.addControl('bankNumber', new FormControl(''));
    } else {
      this.repaymentLoanForm.removeControl('accountNumber');
      this.repaymentLoanForm.removeControl('checkNumber');
      this.repaymentLoanForm.removeControl('routingCode');
      this.repaymentLoanForm.removeControl('receiptNumber');
      this.repaymentLoanForm.removeControl('bankNumber');
    }
  }

  retrieveLoanRepaymentTemplate(val: any, paymentCommandTypeId: boolean) {
    const dateFormat = this.settingsService.dateFormat;
    const transactionDateFormatted = this.dateUtils.formatDate(val, dateFormat);
    const data = {
      command: paymentCommandTypeId,
      dateFormat: this.settingsService.dateFormat,
      locale: this.settingsService.language.code,
      transactionDate: transactionDateFormatted
    };
    this.loanService.getRepaymentData(this.loanId, data)
    .subscribe((response: any) => {
      this.repaymentdata = response;

      this.repaymentLoanForm.patchValue({
        transactionAmount: this.repaymentdata.amount
      });
    });
  }

  /** Submits the repayment form */
  submit() {
    const repaymentLoanFormData = this.repaymentLoanForm.value;
    const locale = this.settingsService.language.code;
    const dateFormat = this.settingsService.dateFormat;
    const prevTransactionDate: Date = this.repaymentLoanForm.value.transactionDate;
    if (repaymentLoanFormData.transactionDate instanceof Date) {
      repaymentLoanFormData.transactionDate = this.dateUtils.formatDate(prevTransactionDate, dateFormat);
    }
    const data = {
      transactionDate: this.repaymentLoanForm.value.transactionDate,
      transactionAmount: this.repaymentLoanForm.value.transactionAmount,
      externalId: this.repaymentLoanForm.value.externalId,
      paymentTypeId: this.repaymentLoanForm.value.paymentTypeId,
      note: this.repaymentLoanForm.value.note,
      dateFormat,
      locale
    };
    const command = this.repaymentLoanForm.value.paymentCommandTypeId;
    this.loanService.submitLoanActionButton(this.loanId, data, command)
      .subscribe((response: any) => {
        this.router.navigate(['../../transactions'], { relativeTo: this.route });
    });
  }

}
