QT += core gui

TARGET = clipboard
TEMPLATE = app

SOURCES += main.cpp \
           mainwindow.cpp

HEADERS += mainwindow.h

FORMS += mainwindow.ui

INCLUDEPATH += E:/BASIC/Qt/6.8.2/mingw_64/include/QtWidgets \
               E:/BASIC/Qt/6.8.2/mingw_64/include/QtGui \
               E:/BASIC/Qt/6.8.2/mingw_64/include/QtCore

LIBS += -LE:/BASIC/Qt/6.8.2/mingw_64/lib -lQt6Widgets -lQt6Gui -lQt6Core
