import { Component, ViewChild } from '@angular/core';
import { NavParams, Slides, ViewController } from 'ionic-angular';

//Components
import { ProgressBarComponent } from  '../../components/progress-bar/progress-bar.component';

//Services
import { StorageService } from '../../services/storage/storage.service';
import { SettingsService } from '../../services/settings/settings.service';
import { DeviceManagerService } from '../../services/device/device-manager.service';

@Component({
    templateUrl: 'calibrate.html',
})
export class CalibratePage {
    @ViewChild('calibrationSlider') slider: Slides;
    @ViewChild('digilentProgressBar') digilentProgressBar: ProgressBarComponent;
    public storageService: StorageService;
    public settingsService: SettingsService;
    public params: NavParams;
    public viewCtrl: ViewController;
    public deviceManagerService: DeviceManagerService;
    public calibrationInstructions: string = 'There was an error loading the calibration instructions for your device.\n' +
    'Check your reference manual for correct setup before starting the calibration process.';
    public calibrationStatus: string = 'Please wait...';
    public calibrationFailed: boolean = false;
    public calibrationSuccessful: boolean = false;
    public calibrationReadAttempts: number = 0;
    public maxCalibrationReadAttempts: number = 10;
    public timeBetweenReadAttempts: number = 2000;

    public storageLocations: string[] = ['No Locations Found'];
    public selectedLocation: string = 'No Location Selected';
    public calibrationResults: string = 'Results here';
    public calibrationResultsIndicator: string = '';

    constructor(
        _storageService: StorageService,
        _settingsService: SettingsService,
        _params: NavParams,
        _viewCtrl: ViewController,
        _deviceManagerService: DeviceManagerService
    ) {
        this.deviceManagerService = _deviceManagerService;
        this.storageService = _storageService;
        this.settingsService = _settingsService;
        this.viewCtrl = _viewCtrl;
        this.params = _params;
        console.log('calibrate constructor');
        this.getCalibrationInstructions();
    }

    //Need to use this lifestyle hook to make sure the slider exists before trying to get a reference to it
    ionViewDidEnter() {
        let swiperInstance: any = this.slider.getSlider();
        if (swiperInstance == undefined) {
            setTimeout(() => {
                this.ionViewDidEnter();
            }, 20);
            return;
        }
        swiperInstance.lockSwipes();
    }

    closeModal() {
        this.viewCtrl.dismiss();
    }

    selectStorage(event) {
        this.selectedLocation = event;
        console.log(this.selectedLocation);
    }

    toSlide(slideNum: number) {
        let swiperInstance: any = this.slider.getSlider();
        swiperInstance.unlockSwipes();
        this.slider.slideTo(slideNum);
        swiperInstance.lockSwipes();
    }

    toCalibrationSuccessPage() {
        let swiperInstance: any = this.slider.getSlider();
        swiperInstance.unlockSwipes();
        this.slider.slideTo(2);
        swiperInstance.lockSwipes();
        this.calibrationResultsIndicator = 'Calibration was successful and was applied automatically but will be lost when powered down.\nPress save to have this calibration load at startup.';
        this.getStorageLocations();
    }

    saveCalibrationToDevice() {
        this.calibrationResultsIndicator = 'Saving calibration.';
        if (this.selectedLocation === 'No Location Selected') {
            this.calibrationResultsIndicator = 'Error saving calibration. Choose a valid storage location.';
            return;
        }
        if (this.calibrationResults.indexOf('IDEAL') !== -1) {
            this.calibrationResultsIndicator = 'Error saving calibration. One or more channels fell back to ideal values. Rerun calibration.';
            return;
        }
        console.log(this.selectedLocation);
        this.saveCalibration(this.selectedLocation)
            .then(() => {
                this.calibrationResultsIndicator = 'Save successful';
            })
            .catch((err) => {
                this.calibrationResultsIndicator = 'Error saving calibration.';
            });
    }

    onSuccessfulCalibrationApply() {
        this.viewCtrl.dismiss();
    }

    getStorageLocations() {
        this.deviceManagerService.devices[this.deviceManagerService.activeDeviceIndex].calibrationGetStorageTypes().subscribe(
            (data) => {
                console.log(data);
                this.storageLocations = data.device[0].storageTypes;
                this.selectedLocation = this.storageLocations[0];
            },
            (err) => {
                console.log(err);
                this.calibrationResultsIndicator = 'Could not get storage locations for device.';
            },
            () => { }
        );
    }

    getCalibrationInstructions() {
        this.deviceManagerService.devices[this.deviceManagerService.activeDeviceIndex].calibrationGetInstructions().subscribe(
            (data) => {
                console.log(data);
                if (data.device[0].instructions == undefined) { return; }
                this.calibrationInstructions = data.device[0].instructions;
            },
            (err) => {
                console.log(err);
            },
            () => { }
        );
    }

    runCalibration() {
        this.calibrationFailed = false;
        this.calibrationSuccessful = false;
        this.startCalibration();
        this.toSlide(1);
    }

    startCalibration() {
        this.calibrationFailed = false;
        this.calibrationSuccessful = false;
        this.deviceManagerService.devices[this.deviceManagerService.activeDeviceIndex].calibrationStart().subscribe(
            (data) => {
                console.log(data);
                let waitTime = data.device[0].wait < 0 ? this.timeBetweenReadAttempts : data.device[0].wait;
                this.calibrationStatus = 'Running Calibration. This should take about ' + (data.device[0].wait / 1000) + ' seconds.';
                this.calibrationReadAttempts = 0;
                this.runProgressBar(waitTime);
            },
            (err) => {
                console.log(err);
                this.calibrationFailed = true;
                if (err.device[0].statusCode === 2684354573) {
                    this.calibrationStatus = 'Error running calibration. Please check your setup and try again.';
                    return;
                }
                this.calibrationStatus = 'Error starting calibration. Please try again.';
            },
            () => { }
        );
    }

    runProgressBar(waitTime: number) {
        this.digilentProgressBar.start(waitTime);
    }

    progressBarFinished() {
        this.readCalibrationAfterCalibrating();
    }

    loadCalibration(type: string) {
        this.calibrationResultsIndicator = 'Loading calibration.';
        if (this.selectedLocation === 'No Location Selected') {
            this.calibrationResultsIndicator = 'Error loading calibration. Choose a valid storage location.';
            return;
        }
        this.deviceManagerService.devices[this.deviceManagerService.activeDeviceIndex].calibrationLoad(type).subscribe(
            (data) => {
                console.log(data);
                setTimeout(() => {
                    this.readCalibration().catch((e) => {
                        this.calibrationResultsIndicator = 'Error reading current calibration.';
                    });
                }, 750);
                this.calibrationResultsIndicator = 'Loaded calibration successfully.';
            },
            (err) => {
                console.log(err);
                this.calibrationResultsIndicator = 'Error loading calibration.';
            },
            () => { }
        );
    }

    loadSelectedCalibration() {
        this.loadCalibration(this.selectedLocation);
    }

    readCalibration(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.deviceManagerService.devices[this.deviceManagerService.activeDeviceIndex].calibrationRead().subscribe(
                (data) => {
                    console.log(data);
                    this.calibrationStatus = 'Loaded current calibration data.';
                    this.parseCalibrationInformation(data);
                    resolve();
                },
                (err) => {
                    console.log(err);
                    this.calibrationStatus = 'Error loading current calibration.';
                    reject();
                },
                () => { }
            );
        });
    }

    toLoadExistingPage() {
        let swiperInstance: any = this.slider.getSlider();
        swiperInstance.unlockSwipes();
        this.slider.slideTo(3);
        swiperInstance.lockSwipes();
        this.calibrationResultsIndicator = 'Select a storage location and click load.';
        this.calibrationResults = '';
        this.readCalibration().then(() => {
            this.getStorageLocations();
        }).catch((e) => { });
    }

    readCalibrationAfterCalibrating() {
        this.deviceManagerService.devices[this.deviceManagerService.activeDeviceIndex].calibrationRead().subscribe(
            (data) => {
                console.log(data);
                this.calibrationStatus = 'Calibration Successful!';
                this.parseCalibrationInformation(data);
                this.calibrationSuccessful = true;
                this.toCalibrationSuccessPage();
            },
            (err) => {
                console.log(err);
                if (err.device == undefined && this.calibrationReadAttempts < this.maxCalibrationReadAttempts) {
                    this.calibrationReadAttempts++;
                    setTimeout(() => {
                        this.readCalibrationAfterCalibrating();
                    }, this.timeBetweenReadAttempts); 
                    return; 
                }
                if (err.device[0].statusCode === 8) {
                    if (this.calibrationReadAttempts < this.maxCalibrationReadAttempts) {
                        this.calibrationReadAttempts++;
                        setTimeout(() => {
                            this.readCalibrationAfterCalibrating();
                        }, this.timeBetweenReadAttempts);
                    }
                    else {
                        this.calibrationFailed = true;
                        this.calibrationStatus = 'Timeout attempting to read calibration. Check your calibration setup and try again.';
                    }
                }
                else if (err.device[0].statusCode === 2684354578) {
                    //Bad setup
                    this.calibrationFailed = true;
                    this.calibrationStatus = 'Error starting calibration. Please follow the calibration setup.';
                    return;
                }
            },
            () => { }
        );
    }

    parseCalibrationInformation(data: any) {
        let calibrationDataContainer = data.device[0].calibrationData;
        for (let instrument in calibrationDataContainer) {
            if (calibrationDataContainer[instrument].numChans) {
                delete calibrationDataContainer[instrument].numChans;
            }
        }
        let calibrationDataAsString: string = JSON.stringify(calibrationDataContainer, undefined, 4);
        this.calibrationResults = calibrationDataAsString;
    }

    saveCalibration(location: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.deviceManagerService.devices[this.deviceManagerService.activeDeviceIndex].calibrationSave(location).subscribe(
                (data) => {
                    console.log(data);
                    resolve();
                },
                (err) => {
                    console.log(err);
                    reject(err);
                },
                () => { }
            );
        });
    }

}