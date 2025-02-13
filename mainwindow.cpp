#include "mainwindow.h"
#include <QClipboard>
#include <QPushButton>
#include <QVBoxLayout>
#include <QWidget>
#include <QDebug>
#include <QApplication>
#include <QListWidget>
#include <QThread>

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent) {
    QPushButton *copyButton = new QPushButton("Copy Text to Clipboard", this);
    QPushButton *pasteButton = new QPushButton("Paste Text from Clipboard", this);
    historyList = new QListWidget(this);

    // 设置窗口的默认高度
    this->setFixedHeight(600); // 设置为600像素，可以根据需要调整

    // 设置 QListWidget 以支持文本换行
    historyList->setWordWrap(true);

    // 设置条目之间的间距
    historyList->setSpacing(5);

    QVBoxLayout *layout = new QVBoxLayout;
    layout->addWidget(copyButton);
    layout->addWidget(pasteButton);
    layout->addWidget(historyList);

    QWidget *centralWidget = new QWidget(this);
    centralWidget->setLayout(layout);
    setCentralWidget(centralWidget);

    connect(copyButton, &QPushButton::clicked, this, &MainWindow::copyToClipboard);
    connect(pasteButton, &QPushButton::clicked, this, &MainWindow::pasteFromClipboard);

    // 连接剪贴板变化的信号
    QClipboard *clipboard = QApplication::clipboard();
    connect(clipboard, &QClipboard::changed, this, &MainWindow::clipboardChanged);
}

void MainWindow::clipboardChanged() {
    QThread *thread = QThread::create([this]() {
        try {
            QClipboard *clipboard = QApplication::clipboard();
            if (!clipboard) {
                qDebug() << "Clipboard is not available";
                return;
            }

            QString text = clipboard->text();

            // 检查历史记录中是否已存在相同的文本
            for (int i = 0; i < historyList->count(); ++i) {
                if (historyList->item(i)->text() == text) {
                    // 如果存在，移除旧的记录
                    delete historyList->takeItem(i);
                    break;
                }
            }

            // 创建新的 QListWidgetItem
            QFontMetrics metrics(historyList->font());
            int itemHeight = metrics.lineSpacing() * 3; // 三行的高度
            QString truncatedText = text;
            int maxWidth = historyList->width() - 20; // 考虑到边距

            // 如果文本宽度超过最大宽度，进行截断
            while (metrics.horizontalAdvance(truncatedText) > maxWidth && truncatedText.length() > 0) {
                truncatedText.chop(1);
                truncatedText += "...";
                metrics = QFontMetrics(historyList->font());
            }

            try {
                QListWidgetItem *item = new QListWidgetItem(truncatedText);
                item->setSizeHint(QSize(item->sizeHint().width(), itemHeight));
                item->setTextAlignment(Qt::AlignTop);
                historyList->insertItem(0, item); // 将最新的文本添加到列表的顶部
            } catch (const std::exception& e) {
                qDebug() << "Error occurred while adding item to history list: " << e.what();
                qDebug() << "Error details: " << e.what();
                qDebug() << "Error location: " << __FILE__ << ":" << __LINE__;
            }
        } catch (const std::exception& e) {
            qDebug() << "Error occurred in clipboardChanged: " << e.what();
            qDebug() << "Error details: " << e.what();
            qDebug() << "Error location: " << __FILE__ << ":" << __LINE__;
            qDebug() << "Error type: " << typeid(e).name();
        }
    });

    thread->start();
}

void MainWindow::copyToClipboard() {
    QThread *thread = QThread::create([this]() {
        try {
            QClipboard *clipboard = QApplication::clipboard();
            if (!clipboard) {
                qDebug() << "Clipboard is not available";
                return;
            }

            QString text = clipboard->text();
            if (text.isEmpty()) {
                qDebug() << "No text to copy";
                return;
            }

            clipboard->setText(text);
            qDebug() << "Copied text:" << text;

            // 使用信号槽机制更新 UI，确保线程安全
            QMetaObject::invokeMethod(this, "updateHistoryList", Q_ARG(QString, text));
        } catch (const std::exception& e) {
            qDebug() << "Error occurred in copyToClipboard: " << e.what();
            qDebug() << "Error details: " << e.what();
            qDebug() << "Error location: " << __FILE__ << ":" << __LINE__;
            qDebug() << "Error type: " << typeid(e).name();
        }
    });

    thread->start();
}

void MainWindow::updateHistoryList(const QString &text) {
    // 检查历史记录中是否已存在相同的文本
    for (int i = 0; i < historyList->count(); ++i) {
        if (historyList->item(i)->text() == text) {
            // 如果存在，移除旧的记录
            delete historyList->takeItem(i);
            qDebug() << "Removed old entry from history";
            break;
        }
    }

    // 创建新的 QListWidgetItem
    QFontMetrics metrics(historyList->font());
    int itemHeight = metrics.lineSpacing() * 3; // 三行的高度
    QString truncatedText = text;
    int maxWidth = historyList->width() - 20; // 考虑到边距

    // 如果文本宽度超过最大宽度，进行截断
    while (metrics.horizontalAdvance(truncatedText) > maxWidth && truncatedText.length() > 0) {
        truncatedText.chop(1);
        truncatedText += "...";
        metrics = QFontMetrics(historyList->font());
    }

    QListWidgetItem *item = new QListWidgetItem(truncatedText);
    item->setSizeHint(QSize(item->sizeHint().width(), itemHeight));
    item->setTextAlignment(Qt::AlignTop);
    historyList->insertItem(0, item); // 将最新的文本添加到列表的顶部
    qDebug() << "Added new entry to history:" << truncatedText;
}

void MainWindow::pasteFromClipboard() {
    QThread *thread = QThread::create([this]() {
        try {
            QClipboard *clipboard = QApplication::clipboard();
            if (!clipboard) {
                qDebug() << "Clipboard is not available";
                return;
            }

            QString text = clipboard->text();
            qDebug() << "Pasted text:" << text;
        } catch (const std::exception& e) {
            qDebug() << "Error occurred in pasteFromClipboard: " << e.what();
            qDebug() << "Error details: " << e.what();
            qDebug() << "Error location: " << __FILE__ << ":" << __LINE__;
            qDebug() << "Error type: " << typeid(e).name();
        }
    });

    thread->start();
}
